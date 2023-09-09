from datetime import datetime
from secrets import token_urlsafe
from typing import Optional

import bcrypt
import nanoid  # type: ignore
from app.env import SETTINGS
from app.helpers.paste import Paste
from app.helpers.s3 import format_file_path, s3_create_client
from app.models.paste import PasteCreatedModel, PasteModel, UpdatePasteModel
from app.state import State
from litestar import Request, Router, delete, get, post
from litestar.exceptions import HTTPException
from litestar.middleware.rate_limit import RateLimitConfig


@post("/{iv:str}", middleware=[RateLimitConfig(rate_limit=("minute", 35)).middleware])
async def create_paste(state: State, request: Request, iv: str) -> PasteCreatedModel:
    if len(iv) > SETTINGS.max_iv_size:
        raise HTTPException(detail="IV too large", status_code=400)

    download_id = token_urlsafe(32)
    file_key = format_file_path(download_id)
    chunk_buffer = b""

    total_size = 0
    part_number = 1
    parts = []
    async with s3_create_client() as client:
        multipart = await client.create_multipart_upload(
            Bucket=SETTINGS.s3.bucket, Key=file_key
        )
        async for chunk in request.stream():
            chunk_buffer += chunk
            total_size += len(chunk)

            if total_size > SETTINGS.max_paste_size:
                await client.abort_multipart_upload(
                    Bucket=SETTINGS.s3.bucket,
                    Key=file_key,
                    UploadId=multipart["UploadId"],
                )
                raise HTTPException(detail="Paste too large", status_code=400)

            elif len(chunk_buffer) >= 655400:
                uploaded_part = await client.upload_part(
                    Bucket=SETTINGS.s3.bucket,
                    Key=file_key,
                    PartNumber=part_number,
                    UploadId=multipart["UploadId"],
                    Body=chunk_buffer,
                )
                parts.append({"ETag": uploaded_part["ETag"], "PartNumber": part_number})

                chunk_buffer = b""
                part_number += 1

        if chunk_buffer:
            # Upload any remaining bytes after stream completed.
            uploaded_part = await client.upload_part(
                Bucket=SETTINGS.s3.bucket,
                Key=file_key,
                PartNumber=part_number,
                UploadId=multipart["UploadId"],
                Body=chunk_buffer,
            )
            parts.append({"ETag": uploaded_part["ETag"], "PartNumber": part_number})

            chunk_buffer = b""

        await client.complete_multipart_upload(
            Bucket=SETTINGS.s3.bucket,
            Key=file_key,
            UploadId=multipart["UploadId"],
            MultipartUpload={"Parts": parts},
        )

    owner_secret = token_urlsafe(32)

    paste = {
        "_id": nanoid.generate(size=21),  # Slightly shorter then bson ObjectId.
        "iv": iv,
        "download_id": download_id,
        "created": datetime.now(),
        "expires_in_hours": None,
        "access_code": None,
        # Bcrypt hash only used to defend against timing attacks,
        # secret itself already secure enough to avoid brute forcing.
        "owner_secret": bcrypt.hashpw(owner_secret.encode(), bcrypt.gensalt()),
    }
    await state.mongo.paste.insert_one(paste)

    paste.pop("owner_secret")

    return PasteCreatedModel(
        **paste,
        owner_secret=owner_secret,
        download_url=f"{SETTINGS.s3.download_url}/{file_key}",
    )


@delete(
    "/{paste_id:str}/{owner_secret:str}",
    middleware=[RateLimitConfig(rate_limit=("minute", 120)).middleware],
)
async def delete_paste(state: State, paste_id: str, owner_secret: str) -> None:
    await Paste(state, paste_id).delete(owner_secret)


@post(
    "/{paste_id:str}/{owner_secret:str}",
    middleware=[RateLimitConfig(rate_limit=("minute", 40)).middleware],
)
async def update_paste(
    state: State, paste_id: str, owner_secret: str, data: UpdatePasteModel
) -> None:
    await Paste(state, paste_id).update(data, owner_secret)


@get(
    "/{paste_id:str}",
    middleware=[RateLimitConfig(rate_limit=("minute", 60)).middleware],
)
async def get_paste(
    state: State, paste_id: str, access_code: Optional[str] = None
) -> PasteModel:
    return await Paste(state, paste_id).get(access_code=access_code)


router = Router(
    path="/paste", route_handlers=[create_paste, get_paste, delete_paste, update_paste]
)
