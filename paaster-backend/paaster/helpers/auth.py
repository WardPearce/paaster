# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import bcrypt

from starlette.authentication import AuthenticationError


def validate_server_secret(json: dict, hash_password: bytes,
                           ) -> None:
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
        raise AuthenticationError("Server secret not provided")

    if not bcrypt.checkpw(json["serverSecret"].encode(),
                          hash_password):
        raise AuthenticationError("Server secret invalid")
