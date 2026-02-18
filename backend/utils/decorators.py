import logging
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity
from flask_smorest import abort
from db import db
from models import User

logger = logging.getLogger(__name__)

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        logger.debug("Admin access check", extra={"role": claims.get("role")})
        if claims.get("role") != "admin":
            logger.warning("Admin access denied", extra={"role": claims.get("role")})
            return jsonify({"message": "Admin privilege required."}), 403
        return fn(*args, **kwargs)
    return wrapper

def role_required(role_name):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            user_id = get_jwt_identity()
            logger.debug("Role access check", extra={"user_id": user_id, "required_role": role_name})
            user = db.session.get(User, user_id)

            if not user or user.role != role_name:
                logger.warning(
                    "Role access denied",
                    extra={"user_id": user_id, "required_role": role_name, "actual_role": getattr(user, "role", None)},
                )
                abort(403, message="Access forbidden.")
            return fn(*args, **kwargs)
        return decorator
    return wrapper
