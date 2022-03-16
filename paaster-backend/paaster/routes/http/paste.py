# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import nanoid
import secrets
import aiofiles
import aiofiles.os
import bcrypt

from os import path
from typing import AsyncGenerator, Union
from datetime import datetime

from starlette.endpoints import HTTPEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, StreamingResponse
from starlette.authentication import requires

from ...env import (
    NANO_ID_LEN, SAVE_PATH,
    MAX_PASTE_SIZE_MB, READ_CHUNK
)
from ...resources import Sessions


MAX_SIZE = MAX_PASTE_SIZE_MB * 1049000


def format_path(paste_id: str) -> str:
    """Formats the paste path for use in the save directory.

    Parameters
    ----------
    paste_id : str

    Returns
    -------
    str
    """

    return path.join(SAVE_PATH, f"{paste_id}.aes")


class PasteCreateResource(HTTPEndpoint):
    async def put(self, request: Request) -> JSONResponse:
        paste_id = nanoid.generate(size=NANO_ID_LEN)
        server_secret = secrets.token_urlsafe()

        file_path = format_path(paste_id)

        async with aiofiles.open(file_path, "wb") as f_:
            total_size = 0
            async for chunk in request.stream():
                total_size += len(chunk)
                if total_size > MAX_SIZE:
                    await f_.close()
                    await aiofiles.os.remove(file_path)
                    return JSONResponse(
                        {"error": "Encrypted data over max size"},
                        status_code=400
                    )

                await f_.write(chunk)

        now = datetime.now()

        await Sessions.mongo.file.insert_one({
            "_id": paste_id,
            "server_secret": bcrypt.hashpw(server_secret.encode(),
                                           bcrypt.gensalt()),
            "created": now
        })

        return JSONResponse({
            "pasteId": paste_id,
            "serverSecret": server_secret,
            "created": now.timestamp()
        })


class PasteCredentialsResource(HTTPEndpoint):
    @requires("authenticated")
    async def post(self, request: Request) -> JSONResponse:
        json = await request.json()

        if "encryptedClientSecret" not in json:
            return JSONResponse({
                "error": "Encrypted client secret not provided"
            }, status_code=400)

        if "encryptedServerSecret" not in json:
            return JSONResponse({
                "error": "Encrypted server secret not provided"
            }, status_code=400)

        if await Sessions.mongo.file.count_documents({
            "_id": request.path_params["paste_id"]
        }) == 0:
            return JSONResponse({
                "error": "Paste doesn't exist"
            }, status_code=400)

        await Sessions.mongo.paste.insert_one({
            "_id": request.path_params["paste_id"],
            "user_id": request.user.display_name,
            "client_secret": json["encryptedClientSecret"],
            "server_secret": json["encryptedServerSecret"]
        })

        return JSONResponse({})

    @requires("authenticated")
    async def get(self, request: Request) -> JSONResponse:
        result = await Sessions.mongo.paste.find_one({
            "_id": request.path_params["paste_id"],
            "user_id": request.user.display_name
        })
        if not result:
            return JSONResponse({"error": "No credentials"}, status_code=404)

        return JSONResponse({
            "encryptedClientSecret": result["client_secret"],
            "encryptedServerSecret": result["server_secret"]
        })


class PasteResource(HTTPEndpoint):
    async def delete(self, request: Request) -> JSONResponse:
        json = await request.json()
        if "serverSecret" not in json:
            return JSONResponse(
                {"error": "Server secret not provided"},
                status_code=400
            )

        result = await Sessions.mongo.file.find_one({
            "_id": request.path_params["paste_id"]
        })
        if not result:
            return JSONResponse(
                {"error": "Paste not found"},
                status_code=404
            )

        if bcrypt.checkpw(json["serverSecret"].encode(),
                          result["server_secret"]):
            try:
                await aiofiles.os.remove(format_path(result["_id"]))
            except FileNotFoundError:
                pass

            if request.user.is_authenticated:
                await Sessions.mongo.paste.delete_many({
                    "_id": result["_id"],
                    "user_id": request.user.display_name
                })

            await Sessions.mongo.file.delete_many({
                "_id": result["_id"]
            })

            return JSONResponse({"pastedId": result["_id"]})
        else:
            return JSONResponse(
                {"error": "Server secret invalid"},
                status_code=403
            )

    async def get(self, request: Request) -> Union[StreamingResponse,
                                                   JSONResponse]:
        result = await Sessions.mongo.file.find_one({
            "_id": request.path_params["paste_id"]
        })
        if not result:
            return JSONResponse(
                {"error": "Paste not found"},
                status_code=404
            )

        async def stream_content() -> AsyncGenerator[bytes, None]:
            try:
                async with aiofiles.open(format_path(result["_id"]),
                                         "rb") as f_:
                    while data := await f_.read(READ_CHUNK):
                        yield data
            except FileNotFoundError:
                yield b""

        return StreamingResponse(
            stream_content(),
            media_type="application/octet-stream"
        )
