# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import aiofiles

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.background import BackgroundTasks

from fastapi_limiter.depends import RateLimiter

from typing import AsyncGenerator
from datetime import datetime, timedelta

from ...env import (
    MAX_PASTE_SIZE_MB, READ_CHUNK
)
from ...resources import Sessions
from ...helpers.path import delete_file, format_path
from ...basic_auth import validate_paste_auth
from ...models.paste.modify import UpdatePaste


MAX_SIZE = MAX_PASTE_SIZE_MB * 1049000

router = APIRouter()


@router.delete(
    "/",
    dependencies=[
        Depends(RateLimiter(times=20, minutes=1))
    ]
)
async def delete_paste_resource(paste_id: str = Depends(validate_paste_auth)
                                ) -> JSONResponse:
    """Delete a paste.
    """

    await delete_file(paste_id)
    return JSONResponse({"pastedId": paste_id})


@router.post(
    "/",
    dependencies=[
        Depends(RateLimiter(times=20, minutes=1))
    ]
)
async def update_paste_resource(update: UpdatePaste,
                                paste_id: str = Depends(validate_paste_auth)
                                ) -> JSONResponse:
    """Update a pastes details
    """

    if update.delete_after_hours is not None:
        await Sessions.mongo.file.update_one(
            {"_id":  paste_id},
            {"$set": {"delete_after": update.delete_after_hours}}
        )

    return JSONResponse({"pastedId": paste_id})


@router.get(
    "/{paste_id}",
    dependencies=[
        Depends(RateLimiter(times=20, minutes=1))
    ]
)
async def get_paste_resource(paste_id: str) -> StreamingResponse:
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
