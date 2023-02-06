from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PasteModel(BaseModel):
    id: str = Field(..., alias="_id")
    iv: str
    created: datetime
    expires_in_hours: Optional[float] = None
    delete_after_view: bool = False
    download_url: str

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.timestamp(),
        }


class PasteCreatedModel(PasteModel):
    owner_secret: str
