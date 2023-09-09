from app.controllers import paste
from litestar import Router

__all__ = ["router"]


router = Router(path="/controller", route_handlers=[paste.router])
