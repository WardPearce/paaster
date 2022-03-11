
# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware

from .routes import ROUTES

app = Starlette(routes=ROUTES, middleware=[
    Middleware(CORSMiddleware, allow_origins=['*'])
])
