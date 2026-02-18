"""User authentication and profile management endpoints."""

from flask.views import MethodView
from flask_smorest import Blueprint, abort
from sqlalchemy.exc import SQLAlchemyError
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    get_jwt,
    jwt_required,
)
from passlib.hash import pbkdf2_sha256
from flask import request
from sqlalchemy import or_

from db import db
from models import User as UserModel
from schemas import UserSchema, UserRegisterSchema, UserUpdateSchema, UserLoginSchema, ChangePasswordSchema, UserListResponseSchema
from blocklist import BLOCKLIST
from utils.decorators import admin_required
from utils.initials import generate_unique_initials

blp = Blueprint("Users", __name__, description="Operations on users")


def _get_user_or_404(user_id):
    user = db.session.get(UserModel, user_id)
    if not user:
        abort(404, message="User not found.")
    return user



@blp.route("/auth/login")
class Login(MethodView):
    """Authentication endpoint for user login."""

    @blp.arguments(UserLoginSchema)
    def post(self, data):
        """Validate credentials and return access/refresh tokens."""
        user = UserModel.query.filter_by(email=data["email"].lower().strip()).first()
        if not user or not pbkdf2_sha256.verify(data["password"], user.password):
            abort(401, message="Invalid credentials")

        access = create_access_token(identity=user.id, additional_claims={"role": user.role}, fresh=True )
        refresh = create_refresh_token(identity=user.id)
        return {"access_token": access, "refresh_token": refresh}


@blp.route("/auth/register")
class UserRegister(MethodView):
    """Endpoint for creating a new student account."""

    @blp.arguments(UserRegisterSchema)
    def post(self, user_data):
        """Register a student and return initial token pair."""
        email = user_data["email"].lower().strip()

        if UserModel.query.filter_by(email=email).first():
            abort(409, message="Email already exists.")

        user = UserModel()
        user.email = email
        user.password = pbkdf2_sha256.hash(user_data["password"])
        user.first_name = user_data.get("first_name")
        user.last_name = user_data.get("last_name")
        user.initials = generate_unique_initials(
            user_data.get("first_name"),
            user_data.get("last_name"),
            UserModel,
        )
        user.phone_number = user_data.get("phone_number")
        user.occupation = user_data.get("occupation")
        user.role = "student"

        db.session.add(user)
        db.session.commit()

        access = create_access_token(identity=user.id)
        refresh = create_refresh_token(identity=user.id)

        return {
            "access_token": access,
            "refresh_token": refresh
        }, 201



@blp.route("/auth/logout")
class UserLogout(MethodView):
    """Token revocation endpoint for authenticated users."""

    @jwt_required()
    def post(self):
        """Revoke current JWT by adding its JTI to the blocklist."""
        jti = get_jwt()["jti"]
        BLOCKLIST.add(jti)
        return {"message": "Successfully logged out"}, 200

    
@blp.route("/me")
class UserSelf(MethodView):
    """Read and update operations for the current user profile."""

    @jwt_required()
    @blp.response(200, UserSchema)
    def get(self):
        """Return the authenticated user's profile."""
        user_id = get_jwt_identity()
        return _get_user_or_404(user_id)

    @jwt_required()
    @blp.arguments(UserUpdateSchema)
    @blp.response(200, UserSchema)
    def put(self, user_data):
        """Update profile fields for the authenticated user."""
        user_id = get_jwt_identity()
        user = _get_user_or_404(user_id)

        for field in user_data:
            setattr(user, field, user_data[field])

        if "first_name" in user_data or "last_name" in user_data:
            user.initials = generate_unique_initials(
                user.first_name,
                user.last_name,
                UserModel,
                exclude_user_id=user.id,
            )

        db.session.commit()
        return user
   

@blp.route("/users/<int:user_id>")
class UserAdmin(MethodView):
    """Administrative user operations."""

    @jwt_required(fresh=True)
    @admin_required
    def delete(self, user_id):
        """Delete a user as an admin."""
        user = _get_user_or_404(user_id)

        db.session.delete(user)
        db.session.commit()

        return {"message": "User deleted."}, 200    

@blp.route("/users")
class UserList(MethodView):
    """Paginated listing of non-admin users for admins."""

    @blp.response(200, UserListResponseSchema)
    @jwt_required()
    @admin_required
    def get(self):
        """Return paginated users with optional text search."""
        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 10, type=int)

        search = request.args.get("search", "").strip()
        normalized_search = " ".join(search.split())

        query = UserModel.query.filter(UserModel.role != "admin")

        if search:
            full_name = UserModel.first_name + " " + UserModel.last_name
            query = query.filter(
                or_(
                    UserModel.first_name.ilike(f"%{search}%"),
                    UserModel.last_name.ilike(f"%{search}%"),
                    UserModel.email.ilike(f"%{search}%"),
                    UserModel.occupation.ilike(f"%{search}%"),
                    full_name.ilike(normalized_search),
                    full_name.ilike(f"%{normalized_search}%")
                )
            )

        query = query.order_by(
            UserModel.first_name.asc(),
            UserModel.last_name.asc()
        )

        # 🔹 Apply pagination manually
        pagination = query.paginate(
            page=page,
            per_page=page_size,
            error_out=False
        )

        return {
            "data": pagination.items,
            "pagination": {
                "page": pagination.page,
                "page_size": pagination.per_page,
                "total": pagination.total,
                "total_pages": pagination.pages
            }
        }

    

@blp.route("/me/change_password")    
class UserChangePassword(MethodView):
    """Endpoint for changing current user's password."""

    @blp.arguments(ChangePasswordSchema)
    @jwt_required(fresh=True)
    def put(self, user_data):
        """Validate old password and persist the new password hash."""
        user_id = int(get_jwt_identity())
        user = _get_user_or_404(user_id)
        if not pbkdf2_sha256.verify(user_data["old_password"], user.password):
            abort(401, message="Invalid credentials.")

        user.password = pbkdf2_sha256.hash(user_data["new_password"])
        db.session.add(user)
        db.session.commit()

        return {"message": "Password changed successfully."}, 200

@blp.route("/auth/refresh")
class TokenRefresh(MethodView):
    """Token rotation endpoint using refresh tokens."""

    @jwt_required(refresh=True)
    def post(self):
        """Issue new access and refresh tokens, revoking the previous refresh token."""
        identity = get_jwt_identity()
        claims = get_jwt()

        jti = get_jwt()["jti"]
        BLOCKLIST.add(jti)
        
        new_access = create_access_token(
            identity=identity,
            additional_claims={"role": claims.get("role")},
            fresh=False
        )

        new_refresh = create_refresh_token(identity=identity)

        return {
            "access_token": new_access,
            "refresh_token": new_refresh
        }, 200

