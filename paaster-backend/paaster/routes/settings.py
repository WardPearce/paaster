# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from fastapi import APIRouter
from fastapi.requests import Request

from ..env import MAX_PASTE_SIZE_MB
from ..models.settings import SettingsResponse

router = APIRouter()


@router.get("/api/settings", response_model=SettingsResponse)
async def settings_resource(request: Request) -> SettingsResponse:
    """Share envs publicly with the frontend.
    """

    return SettingsResponse(
        maxPasteSizeMb=MAX_PASTE_SIZE_MB
    )
