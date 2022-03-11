
# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from starlette.routing import Mount, Route

from .settings import SettingsResource


ROUTES = [
    Mount("/api", routes=[
        Route("/settings", SettingsResource)
    ])
]
