import base64
import binascii
import bcrypt

from starlette.authentication import (
    AuthCredentials, AuthenticationBackend, AuthenticationError, SimpleUser
)

from .resources import Sessions

AUTH_ERROR = "Invalid basic auth credentials"


class BasicAuthBackend(AuthenticationBackend):
    async def authenticate(self, conn):
        if "Authorization" not in conn.headers:
            return

        auth = conn.headers["Authorization"]
        try:
            scheme, credentials = auth.split()
            if scheme.lower() != "basic":
                return
            decoded = base64.b64decode(credentials).decode("ascii")
        except (ValueError, UnicodeDecodeError, binascii.Error):
            raise AuthenticationError(AUTH_ERROR)

        username, _, password = decoded.partition(":")

        result = await Sessions.mongo.account.find_one({
            "username": username
        })
        if not result or not bcrypt.checkpw(password.encode(),
                                            result["passwordHash"]):
            raise AuthenticationError(AUTH_ERROR)

        return AuthCredentials(["authenticated"]), SimpleUser(result["_id"])
