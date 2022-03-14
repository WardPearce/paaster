# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from starlette.endpoints import HTTPEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse

from ..decorators import require_captcha


class AccountResource(HTTPEndpoint):
    @require_captcha
    async def post(self, request: Request) -> JSONResponse:
        return JSONResponse({})
