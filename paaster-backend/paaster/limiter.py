# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from slowapi import Limiter  # type: ignore
from slowapi.util import get_remote_address  # type: ignore

from .env import REDIS_HOST, REDIS_PORT


LIMITER = Limiter(
    key_func=get_remote_address,
    storage_uri=f"redis://{REDIS_HOST}:{REDIS_PORT}"
)
