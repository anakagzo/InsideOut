import os
from datetime import timedelta


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


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    ENV = "development"


class ProductionConfig(BaseConfig):
    DEBUG = False
    ENV = "production"
