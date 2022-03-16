# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from starlette.routing import Mount, Route

from .http.settings import SettingsResource
from .http.paste import (
    PasteCreateResource, PasteResource
)
from .http.captcha import CaptchaResource


ROUTES = [
    Mount("/api", routes=[
        Route("/settings", SettingsResource),
        Mount("/paste", routes=[
            Route("/create", PasteCreateResource),
            Route("/{paste_id}", PasteResource)
        ]),
        Route("/captcha", CaptchaResource)
    ])
]
