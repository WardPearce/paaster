
# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import os

from dotenv import load_dotenv


load_dotenv()


MONGO_HOST = os.environ["MONGO_HOST"]
MONGO_PORT = os.environ["MONGO_PORT"]

SAVE_PATH = os.environ["SAVE_PATH"]

NANO_ID = int(os.getenv("NANO_ID", 12))
