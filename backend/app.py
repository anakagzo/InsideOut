import os
import logging
import click
from flask import Flask, jsonify, send_from_directory
from flask_smorest import Api
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from sqlalchemy.exc import SQLAlchemyError

from db import db
from blocklist import BLOCKLIST
from config import DevelopmentConfig, ProductionConfig
from models import User as UserModel

from resources.user import blp as UserBlueprint
from resources.review import blp as ReviewBlueprint
from resources.course import blp as CourseBlueprint
from resources.enrollment import blp as EnrollmentBlueprint
from resources.schedule import blp as ScheduleBlueprint
from resources.availability import blp as AvailabilityBlueprint 
from resources.notification import blp as NotificationBlueprint
from resources.payment import blp as PaymentBlueprint
from utils.scheduler import init_scheduler
from utils.initials import generate_unique_initials
from utils.security import hash_password

def _configure_logging(app):
    level_name = str(app.config.get("LOG_LEVEL", "INFO")).upper()
    log_level = getattr(logging, level_name, logging.INFO)
    log_format = app.config.get(
        "LOG_FORMAT",
        "%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    date_format = app.config.get("LOG_DATE_FORMAT", "%Y-%m-%d %H:%M:%S")

    root_logger = logging.getLogger()
    if not root_logger.handlers:
        logging.basicConfig(level=log_level, format=log_format, datefmt=date_format)
    else:
        root_logger.setLevel(log_level)
        formatter = logging.Formatter(log_format, datefmt=date_format)
        for handler in root_logger.handlers:
            handler.setLevel(log_level)
            handler.setFormatter(formatter)

    app.logger.setLevel(log_level)
    app.logger.info("Logging configured", extra={"log_level": level_name})


def create_app(db_url=None):
    app = Flask(__name__)

    env = os.getenv("APP_ENV", "development").lower()
    config_class = ProductionConfig if env == "production" else DevelopmentConfig
    app.config.from_object(config_class)
    _configure_logging(app)

    if db_url:
        app.config["SQLALCHEMY_DATABASE_URI"] = db_url

    db.init_app(app)
    migrate = Migrate(app, db)
    api = Api(app)

    init_scheduler(app)

    #JWTManager(app)
    jwt = JWTManager(app)

    # @jwt.additional_claims_loader
    # def add_claims_to_jwt(identity):
    #     # TODO: Read from a config file instead of hard-coding
    #     if identity == 1:
    #         return {"is_admin": True}
    #     return {"is_admin": False}

    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        return jwt_payload["jti"] in BLOCKLIST

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return (
            jsonify({"message": "The token has expired.", "error": "token_expired"}),
            401,
        )

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return (
            jsonify(
                {"message": "Signature verification failed.", "error": "invalid_token"}
            ),
            401,
        )

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return (
            jsonify(
                {
                    "description": "Request does not contain an access token.",
                    "error": "authorization_required",
                }
            ),
            401,
        )

    @jwt.needs_fresh_token_loader
    def token_not_fresh_callback(jwt_header, jwt_payload):
        return (
            jsonify(
                {
                    "description": "The token is not fresh.",
                    "error": "fresh_token_required",
                }
            ),
            401,
        )

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return (
            jsonify(
                {"description": "The token has been revoked.", "error": "token_revoked"}
            ),
            401,
        )

    @app.get("/media/<path:filename>")
    def serve_local_media(filename):
        upload_dir = app.config.get("MEDIA_LOCAL_UPLOAD_DIR", "uploads")
        if not os.path.isabs(upload_dir):
            upload_dir = os.path.join(app.root_path, upload_dir)

        return send_from_directory(upload_dir, filename)


    api.register_blueprint(UserBlueprint)
    api.register_blueprint(ReviewBlueprint)
    api.register_blueprint(CourseBlueprint)
    api.register_blueprint(EnrollmentBlueprint)
    api.register_blueprint(ScheduleBlueprint)
    api.register_blueprint(AvailabilityBlueprint)
    api.register_blueprint(NotificationBlueprint)
    api.register_blueprint(PaymentBlueprint)

    @app.cli.command("seed-admin")
    @click.option(
        "--email",
        envvar="SEED_ADMIN_EMAIL",
        required=True,
        help="Admin email (or set SEED_ADMIN_EMAIL).",
    )
    @click.option(
        "--password",
        envvar="SEED_ADMIN_PASSWORD",
        required=False,
        help="Admin password (or set SEED_ADMIN_PASSWORD).",
    )
    @click.option(
        "--first-name",
        envvar="SEED_ADMIN_FIRST_NAME",
        required=False,
        default="System",
        show_default=True,
        help="Admin first name.",
    )
    @click.option(
        "--last-name",
        envvar="SEED_ADMIN_LAST_NAME",
        required=False,
        default="Admin",
        show_default=True,
        help="Admin last name.",
    )
    @click.option(
        "--phone-number",
        envvar="SEED_ADMIN_PHONE_NUMBER",
        required=False,
        default="",
        help="Admin phone number.",
    )
    @click.option(
        "--occupation",
        envvar="SEED_ADMIN_OCCUPATION",
        required=False,
        default="",
        help="Admin occupation.",
    )
    @click.option(
        "--rotate-password",
        is_flag=True,
        default=False,
        help="If admin already exists, rotate password using --password.",
    )
    def seed_admin(email, password, first_name, last_name, phone_number, occupation, rotate_password):
        """Create or update an admin account from backend context only."""
        normalized_email = email.strip().lower()
        first_name = (first_name or "").strip() or "System"
        last_name = (last_name or "").strip() or "Admin"
        phone_number = (phone_number or "").strip() or None
        occupation = (occupation or "").strip() or None

        if rotate_password and not password:
            raise click.ClickException("--rotate-password requires --password or SEED_ADMIN_PASSWORD.")

        try:
            existing_user = UserModel.query.filter_by(email=normalized_email).first()

            if existing_user:
                existing_user.role = "admin"
                existing_user.first_name = first_name
                existing_user.last_name = last_name
                existing_user.phone_number = phone_number
                existing_user.occupation = occupation
                existing_user.initials = generate_unique_initials(
                    first_name,
                    last_name,
                    UserModel,
                    exclude_user_id=existing_user.id,
                )

                if rotate_password:
                    existing_user.password = hash_password(password)

                db.session.add(existing_user)
                db.session.commit()

                click.echo("Admin user updated successfully.")
                return

            if not password:
                raise click.ClickException(
                    "--password or SEED_ADMIN_PASSWORD is required when creating a new admin."
                )

            admin_user = UserModel()
            admin_user.email = normalized_email
            admin_user.password = hash_password(password)
            admin_user.first_name = first_name
            admin_user.last_name = last_name
            admin_user.initials = generate_unique_initials(first_name, last_name, UserModel)
            admin_user.phone_number = phone_number
            admin_user.occupation = occupation
            admin_user.role = "admin"

            db.session.add(admin_user)
            db.session.commit()

            click.echo("Admin user created successfully.")
        except SQLAlchemyError as exc:
            db.session.rollback()
            raise click.ClickException("Failed to seed admin user.") from exc

    return app
