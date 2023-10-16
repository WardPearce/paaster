from typing import Optional

from pydantic import BaseModel
from pydantic_settings import BaseSettings


class MongoDB(BaseModel):
    host: str = "localhost"
    port: int = 27017
    collection: str = "paasterv2"


class ProxiedUrls(BaseModel):
    frontend: str = "http://localhost"
    backend: str = "http://localhost/api"


class S3(BaseModel):
    region_name: str
    secret_access_key: str
    access_key_id: str
    bucket: str
    folder: str = "pastes"
    download_url: str
    endpoint_url: Optional[str] = None


class OpenAPI(BaseModel):
    title: str = "paaster.io"
    version: str = "2.0.0"


class Settings(BaseSettings):
    max_paste_size: int = 1049000
    max_iv_size: int = 42

    mongo: MongoDB = MongoDB()
    proxy_urls: ProxiedUrls = ProxiedUrls()
    s3: S3
    open_api: OpenAPI = OpenAPI()

    class Config:
        env_prefix = "paaster_"


SETTINGS = Settings()  # type: ignore
