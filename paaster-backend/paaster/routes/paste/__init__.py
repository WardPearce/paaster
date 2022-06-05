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

from datetime import datetime, timedelta
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.requests import Request
from fastapi.responses import StreamingResponse
from fastapi.background import BackgroundTasks

from fastapi_limiter.depends import RateLimiter

from ...env import (
    NANO_ID_LEN,
    MAX_PASTE_SIZE_MB,
    READ_CHUNK
)
from ...resources import Sessions
from ...helpers.path import format_path, delete_file
from ...models.paste import CreatePasteResponse


MAX_SIZE = MAX_PASTE_SIZE_MB * 1049000

router = APIRouter()


@router.put(
    "/create",
    dependencies=[
        Depends(RateLimiter(times=20, minutes=1))
    ],
    response_model=CreatePasteResponse
)
async def create_paste_resource(request: Request) -> CreatePasteResponse:
    """paaster expects IVs, salts & encrypted data to be transformed
    into hexadecimal (base16), these should be separated using commas (,).

    formatted like the following, {iv},{salt},{encrypted_data}
    """

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
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Encrypted data over max size"
                )

            await f_.write(chunk)

    now = datetime.now()

    await Sessions.mongo.file.insert_one({
        "_id": paste_id,
        "server_secret": bcrypt.hashpw(server_secret.encode(),
                                       bcrypt.gensalt()),
        "created": now
    })

    return CreatePasteResponse(
        pasteId=paste_id,
        serverSecret=server_secret,
        created=now.timestamp()
    )


@router.get(
    "/{paste_id}",
    dependencies=[
        Depends(RateLimiter(times=20, minutes=1))
    ],
    response_model=str
)
async def get_paste_resource(paste_id: str) -> StreamingResponse:
    """Get the encrypted data.
    Formatted like the following, {iv},{salt},{encrypted_data}
    """
    result = await Sessions.mongo.file.find_one({
        "_id": paste_id
    })
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paste not found"
        )

    background_task = None
    if "delete_after" in result and result["delete_after"] != -1:
        if result["delete_after"] == 0:
            background_task = BackgroundTasks()
            background_task.add_task(delete_file, paste_id=result["_id"])
        elif (datetime.now() > result["created"] +
                timedelta(hours=result["delete_after"])):

            await delete_file(paste_id=result["_id"])

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Paste not found"
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
