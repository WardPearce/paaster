# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import aiofiles.os
from os import path

from ..env import SAVE_PATH
from ..resources import Sessions


def format_path(paste_id: str) -> str:
    """Formats the paste path for use in the save directory.

    Parameters
    ----------
    paste_id : str

    Returns
    -------
    str
    """

    return path.join(SAVE_PATH, f"{paste_id}.aes")


async def delete_file(paste_id: str) -> None:
    try:
        await aiofiles.os.remove(format_path(paste_id))
    except FileNotFoundError:
        pass

    await Sessions.mongo.file.delete_many({
        "_id": paste_id
    })
