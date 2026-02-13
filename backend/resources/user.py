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

from db import db
from models import User as UserModel
from schemas import UserSchema, UserRegisterSchema, UserUpdateSchema, UserLoginSchema, ChangePasswordSchema
from blocklist import BLOCKLIST
from utils.decorators import admin_required

blp = Blueprint("Users", __name__, description="Operations on users")



@blp.route("/auth/login")
class Login(MethodView):
    @blp.arguments(UserLoginSchema)
    def post(self, data):
        user = UserModel.query.filter_by(email=data["email"].lower().strip()).first()
        if not user or not pbkdf2_sha256.verify(data["password"], user.password):
            abort(401, message="Invalid credentials")

        access = create_access_token(identity=user.id, additional_claims={"role": user.role}, fresh=True )
        refresh = create_refresh_token(identity=user.id)
        return {"access_token": access, "refresh_token": refresh}


@blp.route("/auth/register")
class UserRegister(MethodView):
    @blp.arguments(UserRegisterSchema)
    def post(self, user_data):
        email = user_data["email"].lower().strip()

        if UserModel.query.filter_by(email=email).first():
            abort(409, message="Email already exists.")

        user = UserModel(
            email=email,
            password=pbkdf2_sha256.hash(user_data["password"]),
            first_name=user_data.get("first_name"),
            last_name=user_data.get("last_name"),
            role="student",  # explicit default
        )

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
    @jwt_required()
    def post(self):
        jti = get_jwt()["jti"]
        BLOCKLIST.add(jti)
        return {"message": "Successfully logged out"}, 200

    
@blp.route("/me")
class UserSelf(MethodView):

    @jwt_required()
    @blp.response(200, UserSchema)
    def get(self):
        user_id = get_jwt_identity()
        return UserModel.query.get_or_404(user_id)

    @jwt_required()
    @blp.arguments(UserUpdateSchema)
    @blp.response(200, UserSchema)
    def put(self, user_data):
        user_id = get_jwt_identity()
        user = UserModel.query.get_or_404(user_id)

        for field in user_data:
            setattr(user, field, user_data[field])

        db.session.commit()
        return user
   

@blp.route("/users/<int:user_id>")
class UserAdmin(MethodView):

    @jwt_required(fresh=True)
    @admin_required
    def delete(self, user_id):
        user = UserModel.query.get_or_404(user_id)

        db.session.delete(user)
        db.session.commit()

        return {"message": "User deleted."}, 200    

@blp.route("/users")
class UserList(MethodView):
    @blp.response(200, UserSchema(many=True))
    @jwt_required()
    @admin_required
    def get(self):
        return UserModel.query.all()
    

@blp.route("/me/change_password")    
class UserChangePassword(MethodView):
    @blp.arguments(ChangePasswordSchema)
    @jwt_required(fresh=True)
    def put(self, user_data):
        user_id = int(get_jwt_identity())
        user = UserModel.query.get_or_404(user_id)
        if not pbkdf2_sha256.verify(user_data["old_password"], user.password):
            abort(401, message="Invalid credentials.")

        user.password = pbkdf2_sha256.hash(user_data["new_password"])
        db.session.add(user)
        db.session.commit()

        return {"message": "Password changed successfully."}, 200

@blp.route("/auth/refresh")
class TokenRefresh(MethodView):

    @jwt_required(refresh=True)
    def post(self):
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

