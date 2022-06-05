# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from pydantic import BaseModel


class SettingsResponse(BaseModel):
    maxPasteSizeMb: float
