# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from starlette.endpoints import HTTPEndpoint
from starlette.requests import Request
from starlette.authentication import requires
from starlette.responses import JSONResponse

from ...resources import Sessions


class PastesResource(HTTPEndpoint):
    @requires("authenticated")
    async def get(self, request: Request) -> JSONResponse:
        pastes = []
        find_pastes = Sessions.mongo.paste.find({
            "user_id": request.user.display_name
        })
        async for row in find_pastes:
            pastes.append({
                "pasteId": row["_id"],
                "encryptedClientSecret": row["client_secret"],
                "encryptedServerSecret": row["server_secret"]
            })

        return JSONResponse(pastes)
