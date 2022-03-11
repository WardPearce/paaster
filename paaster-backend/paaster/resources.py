# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

from motor import motor_asyncio


class Sessions:
    mongo: motor_asyncio.AsyncIOMotorCollection
