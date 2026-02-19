import os
import logging
from flask import Flask, jsonify, send_from_directory
from flask_smorest import Api
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

from db import db
from blocklist import BLOCKLIST
from config import DevelopmentConfig, ProductionConfig

from resources.user import blp as UserBlueprint
from resources.review import blp as ReviewBlueprint
from resources.course import blp as CourseBlueprint
from resources.enrollment import blp as EnrollmentBlueprint
from resources.schedule import blp as ScheduleBlueprint
from resources.availability import blp as AvailabilityBlueprint 
from resources.notification import blp as NotificationBlueprint
from resources.payment import blp as PaymentBlueprint
from utils.scheduler import init_scheduler

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

    return app
