"""Security helpers for password hashing and verification."""

from flask import current_app, has_app_context
from passlib.hash import pbkdf2_sha256


DEFAULT_PASSWORD_HASH_ROUNDS = 390000
DEFAULT_PASSWORD_HASH_SALT_SIZE = 16


def _configured_int(name: str, default: int, minimum: int) -> int:
    value = default

    if has_app_context():
        raw = current_app.config.get(name, default)
        try:
            value = int(raw)
        except (TypeError, ValueError):
            value = default

    return max(value, minimum)


def _password_hasher():
    rounds = _configured_int("PASSWORD_HASH_ROUNDS", DEFAULT_PASSWORD_HASH_ROUNDS, 10_000)
    salt_size = _configured_int("PASSWORD_HASH_SALT_SIZE", DEFAULT_PASSWORD_HASH_SALT_SIZE, 8)
    return pbkdf2_sha256.using(rounds=rounds, salt_size=salt_size)


def hash_password(password: str) -> str:
    """Hash a plaintext password using configured PBKDF2 parameters."""
    return _password_hasher().hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify plaintext password against a stored hash."""
    return pbkdf2_sha256.verify(password, password_hash)
