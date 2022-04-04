from starlette.authentication import AuthenticationError
from starlette.requests import Request
from starlette.responses import JSONResponse


def on_auth_error(request: Request, exc: AuthenticationError):
    return JSONResponse({"error": str(exc)}, status_code=401)
