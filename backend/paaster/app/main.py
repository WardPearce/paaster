from app.controllers import router
from app.env import SETTINGS
from app.resources import Sessions
from litestar import Litestar
from litestar.config.cors import CORSConfig
from litestar.openapi import OpenAPIConfig
from litestar.openapi.spec import Contact, Server
from motor import motor_asyncio
from pydantic import AnyUrl, BaseModel


async def start_motor() -> None:
    # Connect mongodb.
    mongo = motor_asyncio.AsyncIOMotorClient(SETTINGS.mongo.host, SETTINGS.mongo.port)
    await mongo.server_info(None)
    Sessions.mongo = mongo[SETTINGS.mongo.collection]


app = Litestar(
    route_handlers=[router],
    on_startup=[start_motor],
    openapi_config=OpenAPIConfig(
        title=SETTINGS.open_api.title,
        version=SETTINGS.open_api.version,
        root_schema_site="redoc",
        description="OpenAPI specification for paaster.io, you are expected to read our encryption implementation to implement it yourself.",
        servers=[Server(url=SETTINGS.proxy_urls.backend)],
        contact=Contact(
            name="Paaster API team",
            email="wardpearce@pm.me",
            url=AnyUrl("https://github.com/WardPearce/Paaster", scheme="https"),
        ),
    ),
    cors_config=CORSConfig(
        allow_origins=[SETTINGS.proxy_urls.backend, SETTINGS.proxy_urls.frontend],
        allow_credentials=True,
    ),
    type_encoders={BaseModel: lambda m: m.dict(by_alias=True)},
)
