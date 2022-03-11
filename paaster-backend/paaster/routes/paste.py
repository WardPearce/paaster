# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from typing import AsyncGenerator, Union
import nanoid
import secrets
import aiofiles
import aiofiles.os

from os import path

from starlette.endpoints import HTTPEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, StreamingResponse

from ..env import (
    NANO_ID_LEN, MONGO_DB, SAVE_PATH,
    MAX_PASTE_SIZE_MB, READ_CHUNK
)
from ..resources import Sessions


MAX_SIZE = MAX_PASTE_SIZE_MB * 1049000


class PasteCreateResource(HTTPEndpoint):
    async def put(self, request: Request) -> JSONResponse:
        server_id = nanoid.generate(NANO_ID_LEN)
        server_secret = secrets.token_urlsafe()

        file_path = path.join(SAVE_PATH, f"{server_id}.bin")

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

        await Sessions.mongo[MONGO_DB].insert_one({
            "_id": server_id,
            "server_secret": server_secret
        })

        return JSONResponse({
            "pasteId": server_id,
            "serverSecret": server_secret
        })


class PasteResource(HTTPEndpoint):
    async def get(self, request: Request) -> Union[StreamingResponse,
                                                   JSONResponse]:
        result = await Sessions.mongo.find_one({
            "_id": request.path_params["server_id"]
        })
        if not result:
            return JSONResponse(
                {"error": "Paste not found"},
                status_code=404
            )

        file_path = path.join(
            SAVE_PATH, f"{result._id}.bin"
        )

        async def stream_file() -> AsyncGenerator[bytes, None]:
            async with aiofiles.open(file_path, "rb") as f_:
                while data := await f_.read(READ_CHUNK):
                    yield data

        return StreamingResponse(stream_file, media_type="text/plain")
