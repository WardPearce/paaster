# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from starlette.endpoints import HTTPEndpoint
from starlette.requests import Request
from starlette.responses import Response

from multicolorcaptcha import CaptchaGenerator
from io import BytesIO


generator = CaptchaGenerator(captcha_size_num=1)


class CaptchaResource(HTTPEndpoint):
    async def get(self, request: Request) -> Response:
        """Generate captcha.
        """

        captcha = generator.gen_captcha_image(
            margin=False,
            difficult_level=3,
            chars_mode="hex"
        )

        request.session["captcha"] = captcha.characters

        buffer = BytesIO()
        captcha.image.save(buffer, format="PNG")

        return Response(
            buffer.getvalue(),
            media_type="image/png"
        )
