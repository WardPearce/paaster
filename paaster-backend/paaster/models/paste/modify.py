# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from pydantic import BaseModel
from typing import Union, Optional


class UpdatePaste(BaseModel):
    delete_after_hours: Optional[Union[int, float]] = None


class PasteModifyResponse(BaseModel):
    pasteId: str
