from app.env import (
    API_TITLE,
    API_VERSION,
    BACKEND_URL,
    FRONTEND_URL,
    MONGO_COLLECTION,
    MONGO_HOST,
    MONGO_PORT,
)
from app.resources import Sessions
from motor import motor_asyncio
from pydantic import AnyUrl, BaseModel
from pydantic_openapi_schema.v3_1_0 import Contact, Server
from starlite import CORSConfig, OpenAPIConfig, Starlite


async def start_motor() -> None:
    # Connect mongodb.
    mongo = motor_asyncio.AsyncIOMotorClient(MONGO_HOST, MONGO_PORT)
    await mongo.server_info()
    Sessions.mongo = mongo[MONGO_COLLECTION]


app = Starlite(
    route_handlers=[],
    on_startup=[start_motor],
    debug=FRONTEND_URL.endswith("localhost"),
    openapi_config=OpenAPIConfig(
        title=API_TITLE,
        version=API_VERSION,
        root_schema_site="redoc",
        description="OpenAPI specification for paaster.io, you are expected to read our encryption implementation to implement it yourself.",
        servers=[Server(url=BACKEND_URL)],
        by_alias=True,
        contact=Contact(
            name="Paaster API team",
            email="wardpearce@pm.me",
            url=AnyUrl("https://github.com/WardPearce/Paaster", scheme="https"),
        ),
    ),
    cors_config=CORSConfig(
        allow_origins=[BACKEND_URL, FRONTEND_URL], allow_credentials=True
    ),
    type_encoders={BaseModel: lambda m: m.dict(by_alias=True)},
)
