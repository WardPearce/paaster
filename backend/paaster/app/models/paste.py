from datetime import datetime
from typing import Optional

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


class UpdatePasteModel(BaseModel):
    expires_in_hours: Optional[float] = Field(..., ge=-1.0, le=99999.0)


class PasteModel(UpdatePasteModel):
    id: str = Field(..., alias="_id")
    iv: str
    created: DatetimeToUTC
    download_url: str


class PasteCreatedModel(PasteModel):
    owner_secret: str
