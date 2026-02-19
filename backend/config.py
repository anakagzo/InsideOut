import os
from datetime import timedelta


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class BaseConfig:
    API_TITLE = "Stores REST API"
    API_VERSION = "v1"
    OPENAPI_VERSION = "3.0.3"
    OPENAPI_URL_PREFIX = "/"
    OPENAPI_SWAGGER_UI_PATH = "/swagger-ui"
    OPENAPI_SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///data.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    PROPAGATE_EXCEPTIONS = True

    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = os.getenv(
        "LOG_FORMAT",
        "%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    LOG_DATE_FORMAT = os.getenv("LOG_DATE_FORMAT", "%Y-%m-%d %H:%M:%S")

    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "insideout-dev-jwt-secret-key-change-this-in-production-2026",
    )
    JWT_IDENTITY_CLAIM = "identity"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    MEDIA_STORAGE_DRIVER = os.getenv("MEDIA_STORAGE_DRIVER", "local")
    MEDIA_LOCAL_UPLOAD_DIR = os.getenv("MEDIA_LOCAL_UPLOAD_DIR", "uploads")
    MEDIA_BASE_URL = os.getenv("MEDIA_BASE_URL", "/media")
    MEDIA_PUBLIC_BASE_URL = os.getenv("MEDIA_PUBLIC_BASE_URL", "")
    DEFAULT_COURSE_IMAGE_URL = os.getenv("DEFAULT_COURSE_IMAGE_URL", "")

    MAX_MEDIA_UPLOAD_MB = int(os.getenv("MAX_MEDIA_UPLOAD_MB", "50"))

    ALLOWED_IMAGE_EXTENSIONS = set(
        part.strip().lower()
        for part in os.getenv("ALLOWED_IMAGE_EXTENSIONS", "jpg,jpeg,png,gif,webp").split(",")
        if part.strip()
    )
    ALLOWED_VIDEO_EXTENSIONS = set(
        part.strip().lower()
        for part in os.getenv("ALLOWED_VIDEO_EXTENSIONS", "mp4,mov,avi,mkv,webm").split(",")
        if part.strip()
    )

    MEDIA_BUCKET_NAME = os.getenv("MEDIA_BUCKET_NAME", "")
    MEDIA_S3_REGION = os.getenv("MEDIA_S3_REGION", "")
    MEDIA_S3_ENDPOINT_URL = os.getenv("MEDIA_S3_ENDPOINT_URL", "")
    MEDIA_S3_ACCESS_KEY = os.getenv("MEDIA_S3_ACCESS_KEY", "")
    MEDIA_S3_SECRET_KEY = os.getenv("MEDIA_S3_SECRET_KEY", "")

    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_CURRENCY = os.getenv("STRIPE_CURRENCY", "gbp")
    FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    ONBOARDING_TOKEN_SECRET = os.getenv("ONBOARDING_TOKEN_SECRET", "")
    ONBOARDING_TOKEN_TTL_SECONDS = int(os.getenv("ONBOARDING_TOKEN_TTL_SECONDS", "172800"))

    # ===== EMAIL SETTINGS =====
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
    EMAIL_FROM = os.getenv("EMAIL_FROM")  # e.g. noreply@yourdomain.com

    # ===== EMAIL RETRY SETTINGS =====
    EMAIL_SCHEDULER_ENABLED = _env_bool("EMAIL_SCHEDULER_ENABLED", True)
    EMAIL_MAX_RETRIES = int(os.getenv("EMAIL_MAX_RETRIES", 3))
    EMAIL_RETRY_INTERVAL_SECONDS = int(os.getenv("EMAIL_RETRY_INTERVAL_SECONDS", 30))
    EMAIL_BATCH_SIZE = int(os.getenv("EMAIL_BATCH_SIZE", 50))
    EMAIL_PROCESSING_CLAIM_TTL_SECONDS = int(os.getenv("EMAIL_PROCESSING_CLAIM_TTL_SECONDS", 300))
    MEETING_REMINDER_CHECK_INTERVAL_SECONDS = int(os.getenv("MEETING_REMINDER_CHECK_INTERVAL_SECONDS", 30))
    MEETING_REMINDER_WINDOW_SECONDS = int(os.getenv("MEETING_REMINDER_WINDOW_SECONDS", 90))
    MEETING_REMINDER_DEFAULT_LEAD_MINUTES = int(os.getenv("MEETING_REMINDER_DEFAULT_LEAD_MINUTES", 60))
    MEETING_REMINDER_MIN_LEAD_MINUTES = int(os.getenv("MEETING_REMINDER_MIN_LEAD_MINUTES", 30))
    MEETING_REMINDER_MAX_LEAD_MINUTES = int(os.getenv("MEETING_REMINDER_MAX_LEAD_MINUTES", 1440))

    
class DevelopmentConfig(BaseConfig):
    DEBUG = True
    ENV = "development"


class ProductionConfig(BaseConfig):
    DEBUG = False
    ENV = "production"
