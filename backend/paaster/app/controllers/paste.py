from datetime import datetime
from secrets import token_urlsafe

import bcrypt
import nanoid
from app.env import SETTINGS
from app.helpers.s3 import format_file_path, s3_create_client
from app.models.paste import PasteCreatedModel, PasteModel
from app.resources import Sessions
from starlite import HTTPException, NotFoundException, Request, Router, get, post
from starlite.middleware import RateLimitConfig


@post("/{iv:str}", middleware=[RateLimitConfig(rate_limit=("minute", 5)).middleware])
async def create_paste(request: Request, iv: str) -> PasteCreatedModel:
    if len(iv) > SETTINGS.max_iv_size:
        raise HTTPException(detail="IV too large", status_code=400)

    # Shorter then Mongo IDs
    paste_id = nanoid.generate(size=21)
    file_key = format_file_path(paste_id)
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
        "_id": paste_id,
        "iv": iv,
        "created": datetime.now(),
        "expires_in_hours": None,
        # Bcrypt hash only used to defend against timing attacks,
        # secret itself already secure enough to avoid brute forcing.
        "owner_secret": bcrypt.hashpw(owner_secret.encode(), bcrypt.gensalt()),
    }
    await Sessions.mongo.paste.insert_one(paste)

    paste.pop("owner_secret")

    return PasteCreatedModel(
        **paste,
        owner_secret=owner_secret,
        download_url=f"{SETTINGS.s3.download_url}/{file_key}",
    )


@get(
    "/{paste_id:str}",
    middleware=[RateLimitConfig(rate_limit=("minute", 60)).middleware],
)
async def get_paste(paste_id: str) -> PasteModel:
    paste = await Sessions.mongo.paste.find_one({"_id": paste_id})
    if not paste:
        raise NotFoundException(detail="No paste found")

    return PasteModel(
        **paste, download_url=f"{SETTINGS.s3.download_url}/{format_file_path(paste_id)}"
    )


router = Router(path="/paste", route_handlers=[create_paste, get_paste])
