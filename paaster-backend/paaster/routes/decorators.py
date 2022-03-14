from typing import Callable
from functools import wraps

from starlette.requests import Request
from starlette.responses import JSONResponse

from ..helpers.captcha import validate_captcha_signing


def require_captcha(func: Callable) -> Callable:
    @wraps(func)
    async def _validate(*args, **kwargs) -> Callable:
        request: Request = args[1]
        if ("captchaSigning" not in request.query_params or
                "captchaCode" not in request.query_params):
            return JSONResponse({
                "error": "Required captcha flags not provided."
            }, status_code=400)

        if validate_captcha_signing(
            request.query_params["captchaCode"],
            request.query_params["captchaSigning"]
        ):
            return await func(*args, **kwargs)
        else:
            return JSONResponse({
                "error": "Captcha code invalid."
            }, status_code=400)

    return _validate
