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

from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.requests import Request
from fastapi.responses import JSONResponse

from fastapi_limiter.depends import RateLimiter

from ...env import (
    NANO_ID_LEN,
    MAX_PASTE_SIZE_MB
)
from ...resources import Sessions
from ...helpers.path import format_path


MAX_SIZE = MAX_PASTE_SIZE_MB * 1049000

router = APIRouter()


@router.put(
    "/create",
    dependencies=[
        Depends(RateLimiter(times=20, minutes=1))
    ]
)
async def create_paste_resource(request: Request) -> JSONResponse:
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

    return JSONResponse({
        "pasteId": paste_id,
        "serverSecret": server_secret,
        "created": now.timestamp()
    })
