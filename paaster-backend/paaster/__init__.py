# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware

from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from motor import motor_asyncio

from .routes import ROUTES
from .resources import Sessions
from .env import (
    MONGO_HOST, MONGO_PORT, MONGO_DB,
    FRONTEND_PROXIED
)
from .limiter import LIMITER


async def on_start() -> None:
    mongo = motor_asyncio.AsyncIOMotorClient(
        MONGO_HOST, MONGO_PORT
    )

    await mongo.server_info()

    Sessions.mongo = mongo[MONGO_DB]


app = Starlette(routes=ROUTES, middleware=[
    Middleware(CORSMiddleware, allow_origins=[FRONTEND_PROXIED],
               allow_methods=["GET", "DELETE", "PUT", "POST"]),
    Middleware(SlowAPIMiddleware)
], on_startup=[on_start])

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.state.limiter = LIMITER
