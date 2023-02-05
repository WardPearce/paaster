from datetime import datetime
from secrets import token_urlsafe

import bcrypt
from app.env import MAX_IV_SIZE, MAX_PASTE_SIZE
from app.models.paste import PasteCreatedModel
from app.resources import Sessions
from starlite import HTTPException, Request, post
from starlite.middleware import RateLimitConfig


@post("/{iv:str}", middleware=[RateLimitConfig(rate_limit=("minute", 5)).middleware])
async def create_paste(request: Request, iv: str) -> PasteCreatedModel:
    if len(iv) > MAX_IV_SIZE:
        raise HTTPException(detail="IV too large", status_code=400)

    total_size = 0
    async for chunk in request.stream():
        total_size += len(chunk)
        if total_size > MAX_PASTE_SIZE:
            raise HTTPException(detail="Paste too large", status_code=400)

    owner_secret = token_urlsafe(32)

    paste = {
        "iv": iv,
        "created": datetime.now(),
        "expires_in_hours": None,
        # Bcrypt hash only used to defend against timing attacks,
        # secret itself already secure enough to avoid brute forcing.
        "owner_secret": bcrypt.hashpw(owner_secret.encode(), bcrypt.gensalt()),
    }
    await Sessions.mongo.paste.insert_one(paste)

    return PasteCreatedModel(**paste, owner_secret=owner_secret, download_url="")
