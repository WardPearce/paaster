# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import os
import secrets

from dotenv import load_dotenv


load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

MONGO_HOST = os.getenv("MONGO_IP", "localhost")
MONGO_PORT = int(os.getenv("MONGO_PORT", 27017))
MONGO_DB = os.getenv("MONGO_DB", "paaster")

SIGNING_SECRET = os.getenv("SIGNING_SECRET", secrets.token_urlsafe(45))
CAPTCHA_SECRET = os.getenv("CAPTCHA_SECRET", secrets.token_urlsafe(45))

FRONTEND_PROXIED = os.getenv("FRONTEND_PROXIED", "https://localhost:3000")

SAVE_PATH = os.getenv(
    "SAVE_PATH",
    os.path.join(
        os.path.dirname(os.path.realpath(__name__)),
        "pastes"
    )
)
if not os.path.exists(SAVE_PATH):
    # Some rclone's might not allow creating empty dirs.
    try:
        os.mkdir(SAVE_PATH)
    except Exception:
        pass

NANO_ID_LEN = int(os.getenv("NANO_ID_LEN", 21))

MAX_PASTE_SIZE_MB = int(os.getenv("MAX_PASTE_SIZE_MB", 3))

READ_CHUNK = int(os.getenv("READ_CHUNK", 1024))
