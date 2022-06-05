# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from fastapi import APIRouter, Depends

from fastapi_limiter.depends import RateLimiter

from ...resources import Sessions
from ...helpers.path import delete_file
from ...basic_auth import validate_paste_auth
from ...models.paste.modify import UpdatePaste, PasteModifyResponse


router = APIRouter()


@router.delete(
    "/",
    dependencies=[
        Depends(RateLimiter(times=20, minutes=1))
    ],
    response_model=PasteModifyResponse
)
async def delete_paste_resource(paste_id: str = Depends(validate_paste_auth)
                                ) -> PasteModifyResponse:
    """Delete a paste.
    """

    await delete_file(paste_id)
    return PasteModifyResponse(pasteId=paste_id)


@router.post(
    "/",
    dependencies=[
        Depends(RateLimiter(times=20, minutes=1))
    ],
    response_model=PasteModifyResponse
)
async def update_paste_resource(update: UpdatePaste,
                                paste_id: str = Depends(validate_paste_auth)
                                ) -> PasteModifyResponse:
    """Update a pastes details
    """

    if update.delete_after_hours is not None:
        await Sessions.mongo.file.update_one(
            {"_id":  paste_id},
            {"$set": {"delete_after": update.delete_after_hours}}
        )

    return PasteModifyResponse(pasteId=paste_id)
