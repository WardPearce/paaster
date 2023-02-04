from os import environ

from dotenv import load_dotenv

load_dotenv()

MONGO_HOST = environ.get("MONGO_IP", "localhost")
MONGO_PORT = int(environ.get("MONGO_PORT", 27017))
MONGO_COLLECTION = environ.get("MONGO_COLLECTION", "paasterv2")


FRONTEND_URL = environ.get("FRONTEND_URL", "http://paaster.localhost")
BACKEND_URL = environ.get("BACKEND_URL", "http://paaster.localhost/api")

MAX_PASTE_SIZE = int(environ.get("MAX_PASTE_SIZE", 1049000))
MAX_IV_SIZE = int(environ.get("MAX_IV_SIZE", 42))

REGION_NAME = environ["REGION_NAME"]
SECRET_ACCESS_KEY = environ["SECRET_ACCESS_KEY"]
ACCESS_KEY_ID = environ["ACCESS_KEY_ID"]
BUCKET = environ["BUCKET"]
FOLDER = environ.get("FOLDER", "pastes")
DOWNLOAD_URL = environ["DOWNLOAD_URL"]
ENDPOINT_URL = environ.get("ENDPOINT_URL", None)

API_TITLE = environ.get("API_TITLE", "paaster.io")
API_VERSION = environ.get("API_VERSION", "2.0.0")
