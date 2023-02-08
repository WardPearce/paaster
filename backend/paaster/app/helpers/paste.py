from collections.abc import Mapping
from datetime import datetime, timedelta
from typing import Any

import bcrypt
from app.env import SETTINGS
from app.helpers.s3 import format_file_path, s3_create_client
from app.models.paste import PasteModel, UpdatePasteModel
from app.resources import Sessions
from starlite import NotAuthorizedException, NotFoundException


class Paste:
    def __init__(self, paste_id: str) -> None:
        self.paste_id = paste_id

    async def delete(self, owner_secret: str) -> None:
        await self.__get_paste_require_owner(owner_secret)
        await self.__delete()

    async def update(self, update: UpdatePasteModel, owner_secret: str) -> None:
        await self.__get_paste_require_owner(owner_secret)
        await Sessions.mongo.paste.update_one(
            {"_id": self.paste_id},
            {"$set": {"expires_in_hours": update.expires_in_hours}},
        )

    async def __delete(self) -> None:
        await Sessions.mongo.paste.delete_one({"_id": self.paste_id})

        async with s3_create_client() as client:
            await client.delete_object(Bucket=SETTINGS.s3.bucket, Key=self.file_key)

    async def __get_paste_require_owner(self, owner_secret: str) -> PasteModel:
        paste = await self.__get_raw()
        if not bcrypt.checkpw(owner_secret.encode(), paste["owner_secret"]):
            raise NotAuthorizedException()

        return PasteModel(
            **paste,
            download_url=self.download_url,
        )

    async def __get_raw(self) -> Mapping[str, Any]:
        paste = await Sessions.mongo.paste.find_one({"_id": self.paste_id})
        if not paste:
            raise NotFoundException(detail="No paste found")
        return paste

    @property
    def file_key(self) -> str:
        return format_file_path(self.paste_id)

    @property
    def download_url(self) -> str:
        return f"{SETTINGS.s3.download_url}/{self.file_key}"

    async def get(self) -> PasteModel:
        paste = await self.__get_raw()

        model = PasteModel(
            **paste,
            download_url=self.download_url,
        )

        if "delete_next_request" in paste and paste["delete_next_request"]:
            await self.__delete()
            raise NotFoundException(detail="No paste found")

        if paste["expires_in_hours"] is not None:
            if paste["expires_in_hours"] < 0:
                await Sessions.mongo.paste.update_one(
                    {"_id": self.paste_id}, {"$set": {"delete_next_request": True}}
                )
                return model

            elif datetime.now() > paste["created"] + timedelta(
                hours=paste["expires_in_hours"]
            ):
                await self.__delete()
                raise NotFoundException(detail="No paste found")

        return model
