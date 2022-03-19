# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import bcrypt

from typing import Union
from starlette.responses import JSONResponse


def validate_server_secret(json: dict, hash_password: bytes,
                           ) -> Union[JSONResponse, None]:
    """Validates the server secret against the db.

    Parameters
    ----------
    json : dict
    hash_password : bytes

    Returns
    -------
    JSONResponse
        Password invalid
    None
        Password valid.
    """

    if "serverSecret" not in json:
        return JSONResponse(
            {"error": "Server secret not provided"},
            status_code=400
        )

    if not bcrypt.checkpw(json["serverSecret"].encode(),
                          hash_password):
        return JSONResponse(
            {"error": "Server secret invalid"},
            status_code=403
        )
