# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi.requests import Request

from ..env import MAX_PASTE_SIZE_MB

router = APIRouter()


@router.get("/api/settings")
async def settings_resource(request: Request) -> JSONResponse:
    """Share envs publicly with the frontend.
    """

    return JSONResponse({
        "maxPasteSizeMb": MAX_PASTE_SIZE_MB
    })
