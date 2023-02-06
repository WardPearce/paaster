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


class PasteModel(BaseModel):
    id: str = Field(..., alias="_id")
    iv: str
    created: DatetimeToUTC
    expires_in_hours: Optional[float] = Field(..., ge=0.001, le=99999.0)
    delete_after_view: bool = False
    download_url: str


class PasteCreatedModel(PasteModel):
    owner_secret: str
