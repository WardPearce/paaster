from datetime import datetime
from typing import Optional

from bson.objectid import ObjectId
from pydantic import BaseModel, Field


class PasteModel(BaseModel):
    id: str = Field(..., alias="_id")
    iv: str
    created: datetime
    expires_in_hours: Optional[float] = None
    download_url: str


class PasteCreatedModel(PasteModel):
    owner_secret: str
