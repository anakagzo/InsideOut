from functools import wraps
from flask_jwt_extended import get_jwt_identity
from flask_smorest import abort
from models.user import UserModel
# if they have admin rights. If not, it aborts the request with a 403 Forbidden error.

from flask_jwt_extended import get_jwt

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if not claims.get("is_admin"):
            abort(403, message="Admin privilege required.")
        return fn(*args, **kwargs)
    return wrapper



