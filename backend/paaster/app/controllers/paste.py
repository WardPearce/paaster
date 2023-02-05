from datetime import datetime
from secrets import token_urlsafe

import bcrypt
import nanoid
from app.env import BUCKET, MAX_IV_SIZE, MAX_PASTE_SIZE
from app.helpers.s3 import format_file_path, s3_create_client
from app.models.paste import PasteCreatedModel
from app.resources import Sessions
from starlite import HTTPException, Request, post
from starlite.middleware import RateLimitConfig


@post("/{iv:str}", middleware=[RateLimitConfig(rate_limit=("minute", 5)).middleware])
async def create_paste(request: Request, iv: str) -> PasteCreatedModel:
    if len(iv) > MAX_IV_SIZE:
        raise HTTPException(detail="IV too large", status_code=400)

    # Shorter then Mongo IDs
    paste_id = nanoid.generate()
    file_key = format_file_path(paste_id)
    chunk_buffer = b""

    total_size = 0
    part_number = 0
    async with s3_create_client() as client:
        multipart = await client.create_multipart_upload(Bucket=BUCKET, Key=file_key)
        async for chunk in request.stream():
            chunk_buffer += chunk
            total_size += len(chunk)

            if total_size > MAX_PASTE_SIZE:
                await client.abort_multipart_upload(
                    Bucket=BUCKET,
                    Key=file_key,
                    UploadId=multipart["UploadId"],
                )
                raise HTTPException(detail="Paste too large", status_code=400)

            elif len(chunk_buffer) >= 655400:
                await client.upload_part(
                    Bucket=BUCKET,
                    Key=file_key,
                    PartNumber=part_number,
                    UploadId=multipart["UploadId"],
                    Body=chunk_buffer,
                )

                chunk_buffer = b""
                part_number += 1

        if chunk_buffer:
            # Upload any remaining bytes after stream completed.
            await client.upload_part(
                Bucket=BUCKET,
                Key=file_key,
                PartNumber=part_number,
                UploadId=multipart["UploadId"],
                Body=chunk_buffer,
            )
            chunk_buffer = b""

        await client.complete_multipart_upload(
            Bucket=BUCKET, Key=file_key, UploadId=multipart["UploadId"]
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

    return PasteCreatedModel(**paste, owner_secret=owner_secret, download_url="")
