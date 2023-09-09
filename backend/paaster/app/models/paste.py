from datetime import datetime
from typing import Optional, Union

from env import SETTINGS
from pydantic import BaseModel, Field


class DatetimeToUTC(datetime):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v: datetime) -> float:
        if not isinstance(v, datetime):
            raise ValueError("Not a valid datetime")
        return v.timestamp()


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
    created: DatetimeToUTC
    download_url: str
    language: Optional[PasteLanguage] = None


class PasteCreatedModel(PasteModel):
    owner_secret: str
