# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from starlette.responses import JSONResponse
from starlette.endpoints import HTTPEndpoint
from starlette.requests import Request

from ...env import MAX_PASTE_SIZE_MB


class SettingsResource(HTTPEndpoint):
    async def get(self, request: Request) -> JSONResponse:
        """Share envs publicly with the frontend.
        """
        return JSONResponse({
            "maxPasteSizeMb": MAX_PASTE_SIZE_MB
        })
