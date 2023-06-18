from app.controllers import router
from app.env import SETTINGS
from app.resources import Sessions
from motor import motor_asyncio
from pydantic import BaseModel
from pydantic_openapi_schema.v3_1_0 import Contact, License, Server
from starlite import CORSConfig, OpenAPIConfig, OpenAPIController, Request, Starlite


async def start_motor() -> None:
    # Connect mongodb.
    mongo = motor_asyncio.AsyncIOMotorClient(SETTINGS.mongo.host, SETTINGS.mongo.port)
    await mongo.server_info(None)
    Sessions.mongo = mongo[SETTINGS.mongo.collection]


class OpenAPIControllerRouteFix(OpenAPIController):
    def render_stoplight_elements(self, request: Request) -> str:
        # Gross hack to overwrite the path for the openapi schema file.
        # due to reverse proxying.
        path_copy = str(self.path)
        self.path = SETTINGS.proxy_urls.backend + self.path

        render = super().render_stoplight_elements(request)

        self.path = path_copy
        return render


app = Starlite(
    route_handlers=[router],
    on_startup=[start_motor],
    openapi_config=OpenAPIConfig(
        **SETTINGS.open_api.dict(),
        root_schema_site="elements",
        openapi_controller=OpenAPIControllerRouteFix,
        enabled_endpoints={"openapi.json", "openapi.yaml", "elements"},
        description="OpenAPI specification for paaster.io, you are expected to read our encryption implementation to implement it yourself.",
        servers=[
            Server(url=SETTINGS.proxy_urls.backend, description="Production server.")
        ],
        by_alias=True,
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
    type_encoders={BaseModel: lambda m: m.dict(by_alias=True)},
)
