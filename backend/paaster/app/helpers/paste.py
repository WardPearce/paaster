from collections.abc import Mapping
from datetime import datetime, timedelta
from secrets import token_urlsafe
from typing import Any, Optional

import bcrypt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from litestar.exceptions import NotAuthorizedException, NotFoundException

from app.env import SETTINGS
from app.helpers.s3 import format_file_path, s3_create_client
from app.models.paste import PasteAccessCodeKdf, PasteModel, UpdatePasteModel
from app.state import State

PASSWORD_HASHER = PasswordHasher()


class Paste:
    def __init__(self, state: State, paste_id: str) -> None:
        self.__state = state
        self.paste_id = paste_id

    async def delete(self, owner_secret: str) -> None:
        await self.__validate_owner(owner_secret)
        await self.__delete()

    async def update(self, update: UpdatePasteModel, owner_secret: str) -> None:
        paste = await self.__validate_owner(owner_secret)

        to_set = update.model_dump(exclude_unset=True)
        if "access_code" in to_set:
            to_set["access_code"] = {
                **to_set["access_code"],
                "code": PASSWORD_HASHER.hash(to_set["access_code"]["code"]),
            }
            to_set["download_id"] = token_urlsafe(32)

            old_key = format_file_path(paste["download_id"])

            async with s3_create_client() as client:
                await client.copy_object(
                    Bucket=SETTINGS.s3.bucket,
                    CopySource={
                        "Bucket": SETTINGS.s3.bucket,
                        "Key": old_key,
                    },
                    Key=format_file_path(to_set["download_id"]),
                )

                await client.delete_object(Bucket=SETTINGS.s3.bucket, Key=old_key)

        await self.__state.mongo.paste.update_one(
            {"_id": self.paste_id},
            {"$set": to_set},
        )

    async def __delete(self) -> None:
        paste = await self._get_raw()

        await self.__state.mongo.paste.delete_one({"_id": self.paste_id})

        async with s3_create_client() as client:
            await client.delete_object(
                Bucket=SETTINGS.s3.bucket,
                Key=self.file_key(paste.get("download_id", None)),
            )

    async def __validate_owner(self, owner_secret: str) -> Mapping[str, Any]:
        paste = await self._get_raw()
        # Not Argon2, because is always a 256 bit random string,
        # Bcrypt used to protect against timing attacks.
        if not bcrypt.checkpw(owner_secret.encode(), paste["owner_secret"]):
            raise NotAuthorizedException()

        return paste

    async def _get_raw(self) -> Mapping[str, Any]:
        paste = await self.__state.mongo.paste.find_one({"_id": self.paste_id})
        if not paste:
            raise NotFoundException(detail="No paste found")
        return paste

    def file_key(self, download_id: Optional[str] = None) -> str:
        # Use paste id if download doesn't exist for paste.
        return format_file_path(download_id if download_id else self.paste_id)

    def download_url(self, download_id: Optional[str] = None) -> str:
        return f"{SETTINGS.s3.download_url}/{self.file_key(download_id)}"

    async def access_code_kdf(self) -> PasteAccessCodeKdf:
        paste = await self._get_raw()
        if (
            "access_code" not in paste
            or paste["access_code"] is None
            or isinstance(paste["access_code"], str)
        ):
            raise NotFoundException()

        return PasteAccessCodeKdf(
            salt=paste["access_code"]["salt"],
            ops_limit=paste["access_code"]["ops_limit"],
            mem_limit=paste["access_code"]["mem_limit"],
        )

    async def get(self, access_code: Optional[str] = None) -> PasteModel:
        paste = await self._get_raw()

        if "access_code" in paste and paste["access_code"] is not None:
            if not access_code:
                raise NotAuthorizedException()

            # Check if uses legacy access code
            server_access_code = (
                paste["access_code"]
                if isinstance(paste["access_code"], str)
                else paste["access_code"]["code"]
            )

            try:
                PASSWORD_HASHER.verify(server_access_code, access_code)
            except VerifyMismatchError:
                raise NotAuthorizedException()

        model = PasteModel(
            **paste,
            download_url=self.download_url(paste.get("download_id", None)),
        )

        if "delete_next_request" in paste and paste["delete_next_request"]:
            await self.__delete()
            raise NotFoundException(detail="No paste found")

        if paste["expires_in_hours"] is not None:
            if paste["expires_in_hours"] < 0:
                await self.__state.mongo.paste.update_one(
                    {"_id": self.paste_id}, {"$set": {"delete_next_request": True}}
                )
                return model

            elif datetime.now() > paste["created"] + timedelta(
                hours=paste["expires_in_hours"]
            ):
                await self.__delete()
                raise NotFoundException(detail="No paste found")

        return model
