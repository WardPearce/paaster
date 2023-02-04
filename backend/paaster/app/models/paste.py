from datetime import datetime
from typing import Optional

from bson.objectid import ObjectId
from pydantic import BaseModel, Field


class ObjectIdStr(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v: ObjectId) -> str:
        if not isinstance(v, ObjectId):
            raise ValueError("Not a valid ObjectId")
        return str(v)


class PasteModel(BaseModel):
    id: ObjectIdStr = Field(..., alias="_id")
    iv: str
    created: datetime
    expires: Optional[datetime] = None
    download_url: str


class PasteCreatedModel(PasteModel):
    owner_secret: str
