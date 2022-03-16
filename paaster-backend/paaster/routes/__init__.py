# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from starlette.routing import Mount, Route

from .http.settings import SettingsResource
from .http.paste import (
    PasteCreateResource, PasteResource,
    PasteCredentialsResource
)
from .http.pastes import PastesResource
from .http.captcha import CaptchaResource
from .http.account import AccountResource


ROUTES = [
    Mount("/api", routes=[
        Route("/settings", SettingsResource),
        Mount("/paste", routes=[
            Route("/create", PasteCreateResource),
            Route("/{paste_id}/credentials", PasteCredentialsResource),
            Route("/{paste_id}", PasteResource)
        ]),
        Route("/pastes/credentials", PastesResource),
        Route("/account", AccountResource),
        Route("/captcha", CaptchaResource)
    ])
]
