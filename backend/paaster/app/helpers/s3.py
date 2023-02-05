from os import path

from aiobotocore.session import get_session
from app.env import ACCESS_KEY_ID, ENDPOINT_URL, FOLDER, REGION_NAME, SECRET_ACCESS_KEY


def format_file_path(paste_id: str) -> str:
    return path.join(FOLDER, f"{paste_id}.bin")


def s3_create_client():
    session = get_session()
    return session.create_client(
        "s3",
        region_name=REGION_NAME,
        aws_secret_access_key=SECRET_ACCESS_KEY,
        aws_access_key_id=ACCESS_KEY_ID,
        endpoint_url=ENDPOINT_URL,
    )
