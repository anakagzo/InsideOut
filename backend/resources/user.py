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
from schemas import UserSchema, UserRegisterSchema, UserLoginSchema, EditPasswordSchema, UserUpdateSchema
from blocklist import BLOCKLIST
from utils import admin_required

blp = Blueprint("Users", __name__, description="Operations on users")

@blp.route("/auth/register")
class UserRegister(MethodView):
    @blp.arguments(UserRegisterSchema)
    def post(self, user_data):
        if UserModel.query.filter(UserModel.email == user_data["email"]).first():
            abort(409, message="A user with that email already exists.")

        user = UserModel(
            email=user_data["email"],
            password=pbkdf2_sha256.hash(user_data["password"]),
            profile_image_url=user_data.get("profile_image_url"),
            first_name=user_data.get("first_name"),
            last_name=user_data.get("last_name"),
            account_name=user_data.get("account_name"),
            phone_number=user_data.get("phone_number"),
            occupation=user_data.get("occupation"),
        )
        db.session.add(user)
        db.session.commit()

        return {"message": "User created successfully."}, 201
    
    
@blp.route("/auth/login")
class UserLogin(MethodView):
    @blp.arguments(UserLoginSchema)
    def post(self, user_data):
        user = UserModel.query.filter(
            UserModel.email == user_data["email"]
        ).first()

        if user and pbkdf2_sha256.verify(user_data["password"], user.password):
            

            access_token = create_access_token(
                identity=str(user.id), 
                additional_claims={"is_admin": user.is_admin}, 
                fresh=True)
            refresh_token = create_refresh_token(str(user.id))
            return {"access_token": access_token, "refresh_token": refresh_token}, 200

        abort(401, message="Invalid credentials.")


@blp.route("/auth/logout")
class UserLogout(MethodView):
    @jwt_required()
    def post(self):
        jti = get_jwt()["jti"]
        BLOCKLIST.add(jti)
        return {"message": "Successfully logged out"}, 200


@blp.route("/me")
class User(MethodView):
    @blp.response(200, UserResponseSchema)
    @jwt_required()
    def get(self):
        user_id = int(get_jwt_identity())
        user = UserModel.query.get_or_404(user_id)
        return user
  
    
    @blp.arguments(UserUpdateSchema)
    @blp.response(200, UserSchema)
    @jwt_required()
    def put(self, user_data, user_id):
        user = UserModel.query.get(user_id)

        if user:
            user.profile_image_url = user_data.get(
                "profile_image_url", user.profile_image_url
            ),
            user.first_name = user_data.get("first_name") if "first_name" in user_data else user.first_name,
            user.last_name = user_data.get("last_name") if "last_name" in user_data else user.last_name,
            user.account_name = user_data.get("account_name") if "account_name" in user_data else user.account_name,
            user.phone_number = user_data.get("phone_number") if "phone_number" in user_data else user.phone_number,
            user.occupation = user_data.get("occupation") if "occupation" in user_data else user.occupation,
        else:
            user = UserModel(id=user_id, **user_data)

        db.session.add(user)
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
    @blp.arguments(EditPasswordSchema)
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
    user_role = get_jwt.get("is_admin", False)
    jti = get_jwt()["jti"]
    BLOCKLIST.add(jti)

    return {
        "access_token": create_access_token(
            identity=identity, 
            additional_claims={"is_admin": user_role},
            fresh=False),
        "refresh_token": create_refresh_token(identity=identity),
    }, 200
