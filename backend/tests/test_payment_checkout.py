from types import SimpleNamespace

from db import db
from models.notification import EmailNotificationSettings


def _mock_stripe(monkeypatch, payment_module, *, create_session=None, retrieve_session=None):
    class _MockSessionApi:
        @staticmethod
        def create(**_kwargs):
            if create_session is not None:
                return create_session
            return SimpleNamespace(id="cs_test_123", url="https://checkout.stripe.test/session/123")

        @staticmethod
        def retrieve(_session_id):
            if retrieve_session is not None:
                return retrieve_session
            return SimpleNamespace(
                id="cs_test_123",
                payment_status="paid",
                metadata={"user_id": "1", "course_id": "1"},
            )

    mock_checkout = SimpleNamespace(Session=_MockSessionApi)
    mock_error = SimpleNamespace(StripeError=Exception)
    mock_stripe = SimpleNamespace(checkout=mock_checkout, error=mock_error, api_key=None)
    monkeypatch.setattr(payment_module, "stripe", mock_stripe)


def test_create_stripe_checkout_session(client, app, create_user, create_course, auth_headers, monkeypatch):
    import resources.payment as payment_resource

    user = create_user(role="student", email="stripe-session@example.com")
    course = create_course(title="Stripe Course", price="199.00")

    _mock_stripe(monkeypatch, payment_resource)

    app.config.update(
        STRIPE_SECRET_KEY="sk_test_123",
        STRIPE_PUBLISHABLE_KEY="pk_test_123",
        FRONTEND_BASE_URL="http://localhost:8080",
    )

    response = client.post(
        "/payments/stripe/create-checkout-session",
        json={"course_id": course.id},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["session_id"] == "cs_test_123"
    assert payload["checkout_url"].startswith("https://checkout.stripe.test")


def test_finalize_payment_creates_enrollment_and_validates_token(
    client,
    app,
    create_user,
    create_course,
    auth_headers,
    monkeypatch,
):
    import resources.payment as payment_resource

    user = create_user(role="student", email="stripe-finalize@example.com")
    course = create_course(title="Finalize Course", price="149.00")

    session = SimpleNamespace(
        id="cs_finalize_123",
        payment_status="paid",
        metadata={"user_id": str(user.id), "course_id": str(course.id)},
    )
    _mock_stripe(monkeypatch, payment_resource, retrieve_session=session)

    app.config.update(
        STRIPE_SECRET_KEY="sk_test_123",
        STRIPE_PUBLISHABLE_KEY="pk_test_123",
        ONBOARDING_TOKEN_SECRET="token-secret",
        ONBOARDING_TOKEN_TTL_SECONDS=3600,
    )

    finalize_response = client.post(
        "/payments/stripe/finalize",
        json={"session_id": "cs_finalize_123"},
        headers=auth_headers(user),
    )

    assert finalize_response.status_code == 200
    finalize_payload = finalize_response.get_json()
    assert finalize_payload["enrollment_id"] > 0
    assert finalize_payload["onboarding_token"]

    validate_response = client.post(
        "/payments/onboarding/validate-token",
        json={
            "token": finalize_payload["onboarding_token"],
            "course_id": course.id,
        },
        headers=auth_headers(user),
    )

    assert validate_response.status_code == 200
    validate_payload = validate_response.get_json()
    assert validate_payload["valid"] is True
    assert validate_payload["enrollment_id"] == finalize_payload["enrollment_id"]


def test_webhook_checkout_completed_creates_enrollment(
    client,
    app,
    create_user,
    create_course,
    auth_headers,
    monkeypatch,
):
    import resources.payment as payment_resource

    user = create_user(role="student", email="webhook-student@example.com")
    course = create_course(title="Webhook Course", price="99.00")

    event = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_webhook_123",
                "payment_status": "paid",
                "metadata": {
                    "user_id": str(user.id),
                    "course_id": str(course.id),
                },
            }
        },
    }

    class _MockWebhook:
        @staticmethod
        def construct_event(_payload, _signature, _secret):
            return event

    mock_checkout = SimpleNamespace(Session=SimpleNamespace(create=lambda **_kwargs: None, retrieve=lambda _id: None))
    mock_error = SimpleNamespace(StripeError=Exception, SignatureVerificationError=Exception)
    mock_stripe = SimpleNamespace(checkout=mock_checkout, Webhook=_MockWebhook, error=mock_error, api_key=None)
    monkeypatch.setattr(payment_resource, "stripe", mock_stripe)

    app.config.update(
        STRIPE_SECRET_KEY="sk_test_123",
        STRIPE_WEBHOOK_SECRET="whsec_test_123",
        ONBOARDING_TOKEN_SECRET="token-secret",
    )

    response = client.post(
        "/payments/stripe/webhook",
        data=b"{}",
        headers={"Stripe-Signature": "test-signature"},
    )

    assert response.status_code == 200

    enrollments_response = client.get(
        "/enrollments/",
        headers=auth_headers(user),
    )
    assert enrollments_response.status_code == 200
    payload = enrollments_response.get_json()
    assert payload["pagination"]["total"] == 1


def test_finalize_payment_queues_email_when_enabled(
    client,
    app,
    create_user,
    create_course,
    auth_headers,
    monkeypatch,
):
    import resources.payment as payment_resource
    import utils.notifications as notifications_module

    queued = []
    monkeypatch.setattr(notifications_module, "queue_email", lambda to_email, subject, body: queued.append((to_email, subject, body)))

    admin = create_user(role="admin", email="notify-payment-admin@example.com")
    user = create_user(role="student", email="notify-payment@example.com")
    course = create_course(title="Notify Payment Course", price="199.00")

    session = SimpleNamespace(
        id="cs_notify_123",
        payment_status="paid",
        metadata={"user_id": str(user.id), "course_id": str(course.id)},
    )
    _mock_stripe(monkeypatch, payment_resource, retrieve_session=session)

    app.config.update(
        STRIPE_SECRET_KEY="sk_test_123",
        STRIPE_PUBLISHABLE_KEY="pk_test_123",
        ONBOARDING_TOKEN_SECRET="token-secret",
    )

    response = client.post(
        "/payments/stripe/finalize",
        json={"session_id": "cs_notify_123"},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    recipients = {item[0] for item in queued}
    assert user.email in recipients
    assert admin.email in recipients


def test_finalize_payment_skips_email_when_disabled(
    client,
    app,
    create_user,
    create_course,
    auth_headers,
    monkeypatch,
):
    import resources.payment as payment_resource
    import utils.notifications as notifications_module

    queued = []
    monkeypatch.setattr(notifications_module, "queue_email", lambda to_email, subject, body: queued.append((to_email, subject, body)))

    admin = create_user(role="admin", email="notify-off-admin@example.com")
    user = create_user(role="student", email="notify-off@example.com")
    course = create_course(title="Notify Off Course", price="79.00")

    with app.app_context():
        settings = EmailNotificationSettings()
        settings.user_id = user.id
        settings.notify_on_new_payment = False
        db.session.add(settings)
        db.session.commit()

    session = SimpleNamespace(
        id="cs_notify_off_123",
        payment_status="paid",
        metadata={"user_id": str(user.id), "course_id": str(course.id)},
    )
    _mock_stripe(monkeypatch, payment_resource, retrieve_session=session)

    app.config.update(
        STRIPE_SECRET_KEY="sk_test_123",
        STRIPE_PUBLISHABLE_KEY="pk_test_123",
        ONBOARDING_TOKEN_SECRET="token-secret",
    )

    response = client.post(
        "/payments/stripe/finalize",
        json={"session_id": "cs_notify_off_123"},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    recipients = {item[0] for item in queued}
    assert user.email not in recipients
    assert admin.email in recipients
