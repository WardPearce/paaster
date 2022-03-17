# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from paaster import app

__all__ = [
    "app"
]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)
