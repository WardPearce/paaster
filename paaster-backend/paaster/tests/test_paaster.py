# -*- coding: utf-8 -*-

"""
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
"""

import unittest
import os
import time

from starlette.testclient import TestClient

from ..env import SAVE_PATH

from .. import app


class TestPaaster(unittest.TestCase):
    def test_settings_route(self) -> None:
        with TestClient(app) as client:
            resp = client.get("/api/settings")
            self.assertEqual(resp.status_code, 200)
            self.assertIn(
                "maxPasteSizeMb",
                resp.json()
            )

    def test_create_paste(self) -> None:
        with TestClient(app) as client:
            code = "const foo = bar;"

            resp = client.put(
                "/api/paste/create",
                data=code.encode()
            )
            json = resp.json()

            self.assertIn(
                "pasteId",
                json
            )
            self.assertIn(
                "serverSecret",
                json
            )
            self.assertIn(
                "created",
                json
            )
            file_path = os.path.join(
                SAVE_PATH,
                json["pasteId"] + ".aes"
            )
            self.assertTrue(os.path.join(file_path))

            with open(file_path, "r") as f_:
                self.assertEqual(code, f_.read())

    def test_delete_invalid_secret_paste(self) -> None:
        with TestClient(app) as client:
            resp = client.put(
                "/api/paste/create",
                data=b"const foo = bar;"
            )
            json = resp.json()

            resp = client.delete(
                f"/api/paste/{json['pasteId']}",
                json={"serverSecret": "invalid"}
            )
            self.assertEqual(resp.status_code, 401)

    def test_update_invalid_secret_paste(self) -> None:
        with TestClient(app) as client:
            resp = client.put(
                "/api/paste/create",
                data=b"const foo = bar;"
            )
            json = resp.json()

            resp = client.post(
                f"/api/paste/{json['pasteId']}",
                json={
                    "serverSecret": json["serverSecret"]
                }
            )
            self.assertEqual(resp.status_code, 400)

            resp = client.post(
                f"/api/paste/{json['pasteId']}",
                json={
                    "serverSecret": "invalid",
                    "deleteAfterHours": 0
                }
            )
            self.assertEqual(resp.status_code, 401)

    def test_delete_paste(self) -> None:
        with TestClient(app) as client:
            resp = client.put(
                "/api/paste/create",
                data=b"const foo = bar;"
            )
            json = resp.json()

            resp = client.delete(
                f"/api/paste/{json['pasteId']}",
                json={"serverSecret": json["serverSecret"]}
            )
            self.assertEqual(resp.status_code, 200)

            file_path = os.path.join(
                SAVE_PATH,
                json["pasteId"] + ".aes"
            )
            self.assertFalse(os.path.exists(file_path))

    def test_delete_after_view_paste(self) -> None:
        with TestClient(app) as client:
            resp = client.put(
                "/api/paste/create",
                data=b"const foo = bar;"
            )
            json = resp.json()

            url = f"/api/paste/{json['pasteId']}"

            resp = client.post(
                url,
                json={
                    "deleteAfterHours": 0,
                    "serverSecret": json["serverSecret"]
                }
            )
            self.assertEqual(resp.status_code, 200)

            file_path = os.path.join(
                SAVE_PATH,
                json["pasteId"] + ".aes"
            )
            self.assertTrue(os.path.exists(file_path))

            resp = client.get(url)
            self.assertEqual(resp.status_code, 200)

            time.sleep(5)

            resp = client.get(url)
            self.assertEqual(resp.status_code, 404)
            self.assertFalse(os.path.exists(file_path))

    def test_delete_after_x_time_paste(self) -> None:
        with TestClient(app) as client:
            resp = client.put(
                "/api/paste/create",
                data=b"const foo = bar;"
            )
            json = resp.json()

            url = f"/api/paste/{json['pasteId']}"

            resp = client.post(
                url,
                json={
                    "deleteAfterHours": 0.002778,
                    "serverSecret": json["serverSecret"]
                }
            )
            self.assertEqual(resp.status_code, 200)

            file_path = os.path.join(
                SAVE_PATH,
                json["pasteId"] + ".aes"
            )
            self.assertTrue(os.path.exists(file_path))

            resp = client.get(url)
            self.assertEqual(resp.status_code, 200)

            time.sleep(10.0)

            resp = client.get(url)
            self.assertEqual(resp.status_code, 404)

            time.sleep(5)

            self.assertFalse(os.path.exists(file_path))
