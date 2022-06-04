# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import bcrypt

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from .resources import Sessions


security = HTTPBasic()


async def validate_paste_auth(
        credentials: HTTPBasicCredentials = Depends(security)):

    result = await Sessions.mongo.file.find_one({
        "_id": credentials.username
    })

    if not result or not bcrypt.checkpw(credentials.password.encode(),
                                        result["server_secret"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect pasteId or serverSecret",
            headers={"WWW-Authenticate": "Basic"},
        )

    return result["_id"]
