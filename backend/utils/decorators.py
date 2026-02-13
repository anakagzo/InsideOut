from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity
from flask_smorest import abort
from models import User

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"message": "Admin privilege required."}), 403
        return fn(*args, **kwargs)
    return wrapper

def role_required(role_name):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user or user.role != role_name:
                abort(403, message="Access forbidden.")
            return fn(*args, **kwargs)
        return decorator
    return wrapper
