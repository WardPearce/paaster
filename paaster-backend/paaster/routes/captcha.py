# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import base64

from starlette.endpoints import HTTPEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse

from multicolorcaptcha import CaptchaGenerator
from io import BytesIO

from ..helpers.captcha import hash_sign_captcha


generator = CaptchaGenerator(captcha_size_num=1)


class CaptchaResource(HTTPEndpoint):
    async def get(self, request: Request) -> JSONResponse:
        """Generate captcha.
        """

        captcha = generator.gen_captcha_image(
            margin=False,
            difficult_level=3,
            chars_mode="hex"
        )

        buffer = BytesIO()
        captcha.image.save(buffer, format="PNG")

        return JSONResponse({
            "captchaSigning": hash_sign_captcha(captcha.characters),
            "imageData": "data:image/png;base64," +
            base64.b64encode(buffer.getvalue()).decode("utf-8")
        })
