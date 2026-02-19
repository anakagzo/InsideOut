"""Payment resource endpoints."""

import logging
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

try:
	import stripe
except ImportError:  # pragma: no cover - handled by runtime configuration check
	stripe = None
from flask import current_app
from flask import request
from flask_smorest import Blueprint, abort
from flask.views import MethodView
from flask_jwt_extended import get_jwt_identity, jwt_required
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy.exc import IntegrityError

from db import db
from models import Course, Enrollment, User, Schedule
from utils.notifications import notify_payment_confirmed
from schemas import (
	StripeCheckoutSessionRequestSchema,
	StripeCheckoutSessionResponseSchema,
	StripeFinalizeRequestSchema,
	StripeFinalizeResponseSchema,
	OnboardingTokenValidateRequestSchema,
	OnboardingTokenValidateResponseSchema,
)

blp = Blueprint("Payments", "payments", url_prefix="/payments")
logger = logging.getLogger(__name__)


def _utcnow_naive() -> datetime:
	return datetime.now(UTC).replace(tzinfo=None)


def _get_user_or_404(user_id):
	user = db.session.get(User, user_id)
	if not user:
		abort(404, message="User not found.")
	return user


def _get_course_or_404(course_id):
	course = db.session.get(Course, course_id)
	if not course:
		abort(404, message="Course not found.")
	return course


def _require_stripe_configured():
	if stripe is None:
		abort(500, message="Stripe SDK is not installed on the server.")

	secret_key = current_app.config.get("STRIPE_SECRET_KEY", "")
	if not secret_key:
		abort(500, message="Stripe is not configured.")
	stripe.api_key = secret_key
	publishable_key = current_app.config.get("STRIPE_PUBLISHABLE_KEY", "")
	return publishable_key


def _get_stripe_client() -> Any:
	_require_stripe_configured()
	return stripe


def _stripe_error_message(exc: Exception, fallback: str) -> str:
	message = getattr(exc, "user_message", None)
	if isinstance(message, str) and message.strip():
		return message
	return fallback


def _session_value(session, key, default=None):
	if isinstance(session, dict):
		return session.get(key, default)
	return getattr(session, key, default)


def _finalize_paid_checkout_session(session, expected_user_id=None):
	payment_status = _session_value(session, "payment_status")
	if payment_status != "paid":
		abort(400, message="Payment has not been completed.")

	metadata = _session_value(session, "metadata", {}) or {}
	try:
		session_user_id = int(metadata.get("user_id", 0))
		course_id = int(metadata.get("course_id", 0))
	except (TypeError, ValueError):
		abort(400, message="Stripe session metadata is invalid.")

	if expected_user_id is not None and session_user_id != expected_user_id:
		abort(403, message="Payment session does not belong to current user.")

	if session_user_id <= 0 or course_id <= 0:
		abort(400, message="Stripe session metadata is incomplete.")

	user = _get_user_or_404(session_user_id)
	course = _get_course_or_404(course_id)

	enrollment = Enrollment.query.filter_by(student_id=session_user_id, course_id=course.id).first()
	if not enrollment:
		enrollment = Enrollment()
		enrollment.student_id = session_user_id
		enrollment.course_id = course.id
		enrollment.status = "active"
		enrollment.start_date = _utcnow_naive()
		db.session.add(enrollment)
		try:
			db.session.commit()
		except IntegrityError:
			db.session.rollback()
			enrollment = Enrollment.query.filter_by(student_id=session_user_id, course_id=course.id).first()
	elif enrollment.status == "cancelled":
		enrollment.status = "active"
		db.session.commit()

	if not enrollment:
		abort(500, message="Unable to create enrollment.")

	queued_count = notify_payment_confirmed(user, course.title)
	logger.info(
		"Payment notifications queued",
		extra={"user_id": user.id, "course_id": course.id, "queued_count": queued_count},
	)

	onboarding_token = _create_onboarding_token(
		user_id=session_user_id,
		course_id=course.id,
		enrollment_id=enrollment.id,
		stripe_session_id=_session_value(session, "id", ""),
	)

	return enrollment, onboarding_token


def _get_onboarding_serializer():
	secret_key = current_app.config.get("ONBOARDING_TOKEN_SECRET") or current_app.config.get("JWT_SECRET_KEY")
	if not secret_key:
		abort(500, message="Onboarding token secret is not configured.")
	return URLSafeTimedSerializer(secret_key=secret_key, salt="insideout-onboarding-token")


def _create_onboarding_token(user_id, course_id, enrollment_id, stripe_session_id):
	serializer = _get_onboarding_serializer()
	payload = {
		"user_id": user_id,
		"course_id": course_id,
		"enrollment_id": enrollment_id,
		"stripe_session_id": stripe_session_id,
	}
	return serializer.dumps(payload)


@blp.route("/stripe/create-checkout-session")
class StripeCheckoutSessionCreate(MethodView):
	"""Create Stripe Checkout session for course enrollment payment."""

	@jwt_required()
	@blp.arguments(StripeCheckoutSessionRequestSchema)
	@blp.response(200, StripeCheckoutSessionResponseSchema)
	def post(self, data):
		user_id = int(get_jwt_identity())
		publishable_key = _require_stripe_configured()
		stripe_client = _get_stripe_client()
		if not publishable_key:
			abort(500, message="Stripe publishable key is not configured.")
		user = _get_user_or_404(user_id)
		course = _get_course_or_404(data["course_id"])

		existing = Enrollment.query.filter_by(student_id=user_id, course_id=course.id).first()
		if existing and existing.status in {"active", "completed"}:
			abort(409, message="You are already enrolled in this course.")

		frontend_base_url = current_app.config.get("FRONTEND_BASE_URL", "http://localhost:5173")
		success_url = f"{frontend_base_url}/checkout/{course.id}?status=success&session_id={{CHECKOUT_SESSION_ID}}"
		cancel_url = f"{frontend_base_url}/checkout/{course.id}?status=cancel"

		try:
			amount_minor = int((Decimal(course.price) * 100).quantize(Decimal("1")))
		except (InvalidOperation, TypeError):
			abort(400, message="Invalid course price.")

		try:
			session = stripe_client.checkout.Session.create(
				mode="payment",
				customer_email=user.email,
				metadata={
					"user_id": str(user_id),
					"course_id": str(course.id),
				},
				line_items=[
					{
						"quantity": 1,
						"price_data": {
							"currency": current_app.config.get("STRIPE_CURRENCY", "gbp"),
							"unit_amount": amount_minor,
							"product_data": {
								"name": course.title,
								"description": course.description[:200],
							},
						},
					}
				],
				success_url=success_url,
				cancel_url=cancel_url,
			)
		except Exception as exc:
			logger.exception("Stripe checkout session creation failed", extra={"user_id": user_id, "course_id": course.id})
			abort(502, message=_stripe_error_message(exc, "Unable to create checkout session."))

		return {
			"session_id": session.id,
			"checkout_url": session.url,
			"publishable_key": publishable_key,
		}


@blp.route("/stripe/finalize")
class StripeCheckoutFinalize(MethodView):
	"""Finalize Stripe payment and create enrollment + onboarding token."""

	@jwt_required()
	@blp.arguments(StripeFinalizeRequestSchema)
	@blp.response(200, StripeFinalizeResponseSchema)
	def post(self, data):
		user_id = int(get_jwt_identity())
		stripe_client = _get_stripe_client()

		try:
			session = stripe_client.checkout.Session.retrieve(data["session_id"])
		except Exception as exc:
			abort(502, message=_stripe_error_message(exc, "Unable to verify Stripe session."))

		enrollment, onboarding_token = _finalize_paid_checkout_session(
			session,
			expected_user_id=user_id,
		)

		return {
			"message": "Payment confirmed and enrollment created.",
			"enrollment_id": enrollment.id,
			"onboarding_token": onboarding_token,
		}


@blp.route("/stripe/webhook")
class StripeWebhook(MethodView):
	"""Stripe webhook receiver for checkout completion."""

	def post(self):
		stripe_client = _get_stripe_client()
		webhook_secret = current_app.config.get("STRIPE_WEBHOOK_SECRET", "")
		if not webhook_secret:
			abort(500, message="Stripe webhook secret is not configured.")

		payload = request.get_data(as_text=False)
		signature = request.headers.get("Stripe-Signature", "")

		try:
			event = stripe_client.Webhook.construct_event(payload, signature, webhook_secret)
		except ValueError:
			abort(400, message="Invalid webhook payload.")
		except Exception:
			abort(400, message="Invalid webhook signature.")

		event_type = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)
		if event_type == "checkout.session.completed":
			data = event.get("data", {}) if isinstance(event, dict) else getattr(event, "data", {})
			session = data.get("object") if isinstance(data, dict) else getattr(data, "object", None)
			if session is not None:
				_finalize_paid_checkout_session(session)

		return {"message": "Webhook processed."}, 200


@blp.route("/onboarding/validate-token")
class OnboardingTokenValidate(MethodView):
	"""Validate a server-issued onboarding booking token."""

	@jwt_required()
	@blp.arguments(OnboardingTokenValidateRequestSchema)
	@blp.response(200, OnboardingTokenValidateResponseSchema)
	def post(self, data):
		user_id = int(get_jwt_identity())
		serializer = _get_onboarding_serializer()
		max_age = int(current_app.config.get("ONBOARDING_TOKEN_TTL_SECONDS", 172800))

		try:
			payload = serializer.loads(data["token"], max_age=max_age)
		except SignatureExpired:
			return {
				"valid": False,
				"expired": True,
				"message": "Booking link has expired.",
				"enrollment_id": None,
			}
		except BadSignature:
			return {
				"valid": False,
				"expired": True,
				"message": "Invalid booking link.",
				"enrollment_id": None,
			}

		token_user_id = int(payload.get("user_id", 0))
		token_course_id = int(payload.get("course_id", 0))
		enrollment_id = int(payload.get("enrollment_id", 0))

		if token_user_id != user_id or token_course_id != int(data["course_id"]):
			return {
				"valid": False,
				"expired": True,
				"message": "Booking link is not valid for this user or course.",
				"enrollment_id": None,
			}

		enrollment = db.session.get(Enrollment, enrollment_id)
		if not enrollment or enrollment.student_id != user_id or enrollment.course_id != token_course_id:
			return {
				"valid": False,
				"expired": True,
				"message": "Enrollment is no longer valid for this booking link.",
				"enrollment_id": None,
			}

		has_existing_schedule = (
			Schedule.query.filter_by(enrollment_id=enrollment.id)
			.first()
			is not None
		)
		if has_existing_schedule:
			return {
				"valid": False,
				"expired": True,
				"message": "Booking link has already been used.",
				"enrollment_id": enrollment.id,
			}

		return {
			"valid": True,
			"expired": False,
			"message": "Booking link is valid.",
			"enrollment_id": enrollment.id,
		}
