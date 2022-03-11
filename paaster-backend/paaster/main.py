
# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware

from motor import motor_asyncio

from .routes import ROUTES
from .resources import Sessions
from .env import MONGO_HOST, MONGO_PORT


async def on_start() -> None:
    Sessions.mongo = motor_asyncio.AsyncIOMotorClient(
        MONGO_HOST, MONGO_PORT
    )

    await Sessions.mongo.server_info()


async def on_shut() -> None:
    await Sessions.mongo.close()


app = Starlette(routes=ROUTES, middleware=[
    Middleware(CORSMiddleware, allow_origins=['*'])
], on_startup=[on_start], on_shutdown=[on_shut])
