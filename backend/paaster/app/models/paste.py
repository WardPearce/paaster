from datetime import datetime
from typing import Optional, Union

from pydantic import BaseModel, Field, field_serializer

from app.env import SETTINGS


class PasteLanguage(BaseModel):
    cipher_text: str = Field(..., max_length=128)
    iv: str = Field(..., max_length=SETTINGS.max_iv_size)


class PasteAccessCodeKdf(BaseModel):
    salt: str = Field(max_length=32)
    ops_limit: int
    mem_limit: int


class PasteAccessCode(PasteAccessCodeKdf):
    code: str = Field(min_length=1, max_length=256)


class UpdatePasteModel(BaseModel):
    expires_in_hours: Optional[float] = Field(None, ge=-1.0, le=99999.0)
    access_code: Union[Optional[PasteAccessCode], Optional[str]] = None
    language: Optional[PasteLanguage] = None


class PasteModel(UpdatePasteModel):
    id: str = Field(..., alias="_id")
    iv: str
    created: datetime
    download_url: str
    language: Optional[PasteLanguage] = None

    @field_serializer("created")
    def serialize_created(self, created: datetime, _info) -> float:
        return created.timestamp()


class PasteCreatedModel(PasteModel):
    owner_secret: str
