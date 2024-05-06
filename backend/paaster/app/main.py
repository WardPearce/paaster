from litestar import Litestar, Request
from litestar.config.cors import CORSConfig
from litestar.datastructures import State
from litestar.openapi import OpenAPIConfig
from litestar.openapi.plugins import ScalarRenderPlugin
from litestar.openapi.spec import Contact, License, Server
from motor import motor_asyncio
from pydantic import BaseModel

from app.controllers import router
from app.env import SETTINGS


class ScalarRenderPluginRouteFix(ScalarRenderPlugin):
    @staticmethod
    def get_openapi_json_route(request: Request) -> str:
        return f"{SETTINGS.proxy_urls.backend}/schema/openapi.json"


app = Litestar(
    route_handlers=[router],
    state=State(
        {
            "mongo": motor_asyncio.AsyncIOMotorClient(
                SETTINGS.mongo.host, SETTINGS.mongo.port
            )[SETTINGS.mongo.collection],
        }
    ),
    openapi_config=OpenAPIConfig(
        **SETTINGS.open_api.model_dump(),
        render_plugins=[ScalarRenderPluginRouteFix()],
        description="OpenAPI specification for paaster.io, you are expected to read our encryption implementation to implement it yourself.",
        servers=[
            Server(url=SETTINGS.proxy_urls.backend, description="Production server.")
        ],
        terms_of_service="https://paaster.io/terms-of-service",
        license=License(
            name="GNU Affero General Public License v3.0",
            identifier="AGPL-3.0",
            url="https://github.com/WardPearce/paaster/blob/main/LICENSE",
        ),
        contact=Contact(
            name="Paaster API team",
            email="wardpearce@pm.me",
            url="https://github.com/WardPearce/Paaster",
        ),
    ),
    cors_config=CORSConfig(
        allow_origins=[SETTINGS.proxy_urls.backend, SETTINGS.proxy_urls.frontend],
        allow_credentials=True,
    ),
    type_encoders={BaseModel: lambda m: m.model_dump(by_alias=False)},
)
