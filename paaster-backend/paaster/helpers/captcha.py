# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import bcrypt

from typing import cast
from itsdangerous import URLSafeSerializer
from itsdangerous.exc import BadSignature

from ..env import SIGNING_SECRET, CAPTCHA_SECRET


signer = URLSafeSerializer(SIGNING_SECRET)


def hash_sign_captcha(captcha: str) -> str:
    """Hash & sign captcha in method what's safe to store on client.

    Parameters
    ----------
    captcha : str

    Returns
    -------
    str
    """

    # Hash captcha with CAPTCHA_SECRET appended.
    captcha_hash = bcrypt.hashpw(
        CAPTCHA_SECRET.encode() + captcha.encode(),
        bcrypt.gensalt()
    )
    # Sign hash to validate its ours later.
    return cast(str, signer.dumps(captcha_hash.decode()))


def validate_captcha_signing(user_input: str, signing: str) -> bool:
    try:
        captcha_hash = signer.loads(signing)
    except BadSignature:
        return False

    return bcrypt.checkpw(
        CAPTCHA_SECRET.encode() + user_input.encode(),
        captcha_hash.encode()
    )
