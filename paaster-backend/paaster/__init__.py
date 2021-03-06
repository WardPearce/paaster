# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import aioredis

from fastapi import FastAPI
from fastapi.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware

from fastapi_limiter import FastAPILimiter

from motor import motor_asyncio

from .resources import Sessions
from .env import (
    MONGO_HOST, MONGO_PORT, MONGO_DB,
    FRONTEND_PROXIED, REDIS_HOST, REDIS_PORT
)

from .routes import settings, paste
from .routes.paste import modify


async def on_start() -> None:
    mongo = motor_asyncio.AsyncIOMotorClient(
        MONGO_HOST, MONGO_PORT
    )

    await mongo.server_info()

    Sessions.mongo = mongo[MONGO_DB]

    redis = await aioredis.from_url(
        f"redis://{REDIS_HOST}:{REDIS_PORT}",
        encoding="utf-8",
        decode_responses=True
    )
    await FastAPILimiter.init(redis)

cors_origins = [FRONTEND_PROXIED.lower()]
if cors_origins[0].startswith("https"):
    cors_origins.append(cors_origins[0].replace("https", "http", 1))

app = FastAPI(
    title="Paaster",
    redoc_url="/api/documentation",
    openapi_url="/api/openapi.json",
    docs_url=None,
    middleware=[
        Middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_methods=["GET", "DELETE", "PUT", "POST"],
            allow_headers=["Authorization"]
        ),
    ], on_startup=[on_start])

app.include_router(settings.router)

PASTE_PREFIX = "/api/paste"

app.include_router(
    paste.router,
    prefix=PASTE_PREFIX
)
app.include_router(
    modify.router,
    prefix=PASTE_PREFIX
)
