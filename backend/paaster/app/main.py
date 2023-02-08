from app.controllers import router
from app.env import SETTINGS
from app.resources import Sessions
from motor import motor_asyncio
from pydantic import AnyUrl, BaseModel
from pydantic_openapi_schema.v3_1_0 import Contact, Server
from starlite import CORSConfig, OpenAPIConfig, Starlite


async def start_motor() -> None:
    # Connect mongodb.
    mongo = motor_asyncio.AsyncIOMotorClient(SETTINGS.mongo.host, SETTINGS.mongo.port)
    await mongo.server_info(None)
    Sessions.mongo = mongo[SETTINGS.mongo.collection]


app = Starlite(
    route_handlers=[router],
    on_startup=[start_motor],
    debug=SETTINGS.proxy_urls.frontend.endswith("localhost"),
    openapi_config=OpenAPIConfig(
        **SETTINGS.open_api.dict(),
        root_schema_site="redoc",
        description="OpenAPI specification for paaster.io, you are expected to read our encryption implementation to implement it yourself.",
        servers=[Server(url=SETTINGS.proxy_urls.backend)],
        by_alias=True,
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
