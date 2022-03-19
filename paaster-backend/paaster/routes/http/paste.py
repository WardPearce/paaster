# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import nanoid
import secrets
import aiofiles
import bcrypt
import aiofiles.os

from typing import AsyncGenerator, Union
from datetime import datetime, timedelta

from starlette.endpoints import HTTPEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, StreamingResponse
from starlette.background import BackgroundTask

from ...env import (
    NANO_ID_LEN,
    MAX_PASTE_SIZE_MB, READ_CHUNK
)
from ...resources import Sessions
from ...helpers.auth import validate_server_secret
from ...helpers.path import format_path, delete_file
from ...limiter import LIMITER


MAX_SIZE = MAX_PASTE_SIZE_MB * 1049000


class PasteCreateResource(HTTPEndpoint):
    @LIMITER.limit("20/minute")
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


class PasteResource(HTTPEndpoint):
    @LIMITER.limit("20/minute")
    async def delete(self, request: Request) -> JSONResponse:
        result = await Sessions.mongo.file.find_one({
            "_id": request.path_params["paste_id"]
        })
        if not result:
            return JSONResponse(
                {"error": "Paste not found"},
                status_code=404
            )

        json = await request.json()

        error = validate_server_secret(json, result["server_secret"])
        if error is None:
            await delete_file(result["_id"])
            return JSONResponse({"pastedId": result["_id"]})
        else:
            return error  # type: ignore

    @LIMITER.limit("20/minute")
    async def post(self, request: Request) -> JSONResponse:
        json = await request.json()

        if ("deleteAfterHours" not in json or
                type(json["deleteAfterHours"]) not in (int, float)):
            return JSONResponse(
                {"error": "Delete after hours not provided"},
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

        error = validate_server_secret(json, result["server_secret"])
        if error is None:
            await Sessions.mongo.file.update_one(
                {"_id": result["_id"]},
                {"$set": {"delete_after": json["deleteAfterHours"]}}
            )

            return JSONResponse({"pastedId": result["_id"]})
        else:
            return error  # type: ignore

    @LIMITER.limit("60/minute")
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

        background_task = None
        if "delete_after" in result and result["delete_after"] != -1:
            if (result["delete_after"] == 0 or
                datetime.now() > result["created"] +
                    timedelta(hours=result["delete_after"])):

                background_task = BackgroundTask(
                    delete_file, paste_id=result["_id"]
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
            media_type="application/octet-stream",
            background=background_task  # type: ignore
        )
