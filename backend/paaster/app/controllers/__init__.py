from app.controllers import paste
from starlite import Router

__all__ = ["router"]


router = Router(path="/controller", route_handlers=[paste.router])
