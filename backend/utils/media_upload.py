import os
import importlib
from uuid import uuid4
from werkzeug.utils import secure_filename


class MediaUploadService:
    def __init__(self, app):
        self.app = app
        self.driver = app.config.get("MEDIA_STORAGE_DRIVER", "local").lower()
        self.max_upload_mb = int(app.config.get("MAX_MEDIA_UPLOAD_MB", 50))
        self.max_upload_bytes = self.max_upload_mb * 1024 * 1024

        self.allowed_image_extensions = app.config.get(
            "ALLOWED_IMAGE_EXTENSIONS",
            {"jpg", "jpeg", "png", "gif", "webp"},
        )
        self.allowed_video_extensions = app.config.get(
            "ALLOWED_VIDEO_EXTENSIONS",
            {"mp4", "mov", "avi", "mkv", "webm"},
        )

    @classmethod
    def from_app(cls, app):
        return cls(app)

    def save_course_media(self, file_storage):
        if file_storage is None:
            return None

        file_name = secure_filename(file_storage.filename or "")
        if not file_name:
            raise ValueError("A media file with a valid filename is required.")

        extension = self._get_extension(file_name)
        media_type = self._resolve_media_type(file_storage.mimetype, extension)
        self._validate_size(file_storage)

        storage_key = self._build_storage_key("courses", media_type, extension)

        if self.driver == "local":
            return self._save_local(file_storage, storage_key)

        if self.driver in {"s3", "aws", "digitalocean", "do"}:
            return self._save_s3_compatible(file_storage, storage_key)

        raise RuntimeError("Unsupported MEDIA_STORAGE_DRIVER configuration.")

    def _get_extension(self, file_name):
        if "." not in file_name:
            raise ValueError("Uploaded file must include an extension.")

        return file_name.rsplit(".", 1)[1].lower()

    def _resolve_media_type(self, mimetype, extension):
        normalized_mimetype = (mimetype or "").lower()

        is_image = extension in self.allowed_image_extensions and normalized_mimetype.startswith("image/")
        is_video = extension in self.allowed_video_extensions and normalized_mimetype.startswith("video/")

        if is_image:
            return "images"
        if is_video:
            return "videos"

        raise ValueError("Only valid image or video files are allowed.")

    def _validate_size(self, file_storage):
        stream = file_storage.stream
        current_position = stream.tell()
        stream.seek(0, os.SEEK_END)
        file_size = stream.tell()
        stream.seek(0)

        if file_size > self.max_upload_bytes:
            raise ValueError(f"File too large. Max allowed size is {self.max_upload_mb}MB.")

        if current_position:
            stream.seek(0)

    def _build_storage_key(self, folder, media_type, extension):
        token = uuid4().hex
        return f"{folder}/{media_type}/{token}.{extension}"

    def _save_local(self, file_storage, storage_key):
        upload_dir = self.app.config.get("MEDIA_LOCAL_UPLOAD_DIR", "uploads")
        target_root = upload_dir

        if not os.path.isabs(target_root):
            target_root = os.path.join(self.app.root_path, upload_dir)

        full_path = os.path.join(target_root, *storage_key.split("/"))
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        file_storage.stream.seek(0)
        file_storage.save(full_path)

        media_base_url = self.app.config.get("MEDIA_BASE_URL", "/media").rstrip("/")
        return f"{media_base_url}/{storage_key}"

    def _save_s3_compatible(self, file_storage, storage_key):
        bucket = self.app.config.get("MEDIA_BUCKET_NAME")
        region = self.app.config.get("MEDIA_S3_REGION")
        endpoint_url = self.app.config.get("MEDIA_S3_ENDPOINT_URL")
        access_key = self.app.config.get("MEDIA_S3_ACCESS_KEY")
        secret_key = self.app.config.get("MEDIA_S3_SECRET_KEY")

        if not bucket:
            raise RuntimeError("MEDIA_BUCKET_NAME is required for cloud storage.")

        try:
            boto3 = importlib.import_module("boto3")
        except ModuleNotFoundError as exc:
            raise RuntimeError("boto3 is required for cloud media storage.") from exc

        session = boto3.session.Session()
        client = session.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

        file_storage.stream.seek(0)
        client.upload_fileobj(
            Fileobj=file_storage.stream,
            Bucket=bucket,
            Key=storage_key,
            ExtraArgs={
                "ContentType": file_storage.mimetype or "application/octet-stream",
            },
        )

        public_base_url = self.app.config.get("MEDIA_PUBLIC_BASE_URL")
        if public_base_url:
            return f"{public_base_url.rstrip('/')}/{storage_key}"

        if endpoint_url:
            return f"{endpoint_url.rstrip('/')}/{bucket}/{storage_key}"

        if region:
            return f"https://{bucket}.s3.{region}.amazonaws.com/{storage_key}"

        return f"https://{bucket}.s3.amazonaws.com/{storage_key}"
