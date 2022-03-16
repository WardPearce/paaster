# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import bcrypt
import validators

from uuid import uuid4
from datetime import datetime

from starlette.endpoints import HTTPEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.authentication import requires

from ..decorators import require_captcha

from ...resources import Sessions


class AccountResource(HTTPEndpoint):
    @require_captcha
    async def post(self, request: Request) -> JSONResponse:
        json = await request.json()

        if "username" not in json or "passwordSHA256" not in json:
            return JSONResponse({
                "error": "Username or passwordSHA256 not provided."
            }, status_code=400)

        if not validators.hashes.sha256(json["passwordSHA256"]):
            return JSONResponse({
                "error": "Password isn't a SHA256 hash."
            }, status_code=400)

        if await Sessions.mongo.account.count_documents({
            "username": json["username"]
        }) > 0:
            return JSONResponse({"error": "Name taken"}, status_code=400)

        user_id = str(uuid4())

        await Sessions.mongo.account.insert_one({
            "_id": user_id,
            "username": json["username"],
            "passwordHash": bcrypt.hashpw(
                json["passwordSHA256"].encode(),
                bcrypt.gensalt()
            ),
            "created": datetime.now()
        })

        return JSONResponse({
            "userId": user_id
        })

    @require_captcha
    @requires("authenticated")
    async def get(self, request: Request) -> JSONResponse:
        result = await Sessions.mongo.account.find_one({
            "_id": request.user.display_name
        })

        return JSONResponse({
            "_id": result["_id"],
            "created": result["created"].timestamp()
        })
