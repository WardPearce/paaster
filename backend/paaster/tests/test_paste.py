import time
from datetime import datetime
from typing import Iterator

import pytest
from app.main import app
from app.models.paste import PasteCreatedModel, PasteModel
from starlite import TestClient


@pytest.fixture
def deletion_status() -> int:
    return 0


@pytest.fixture(scope="session")
def client() -> Iterator[TestClient]:
    with TestClient(app=app) as test_client:
        yield test_client


@pytest.fixture
def create_paste(
    deletion_status: int, client: TestClient
) -> Iterator[PasteCreatedModel]:
    response = client.post("/controller/paste/123456", content=b"const foo = bar;")
    assert response.status_code == 201

    r_json = response.json()
    r_json["created"] = datetime.fromtimestamp(r_json["created"])

    r_model = PasteCreatedModel(**r_json)

    response = client.get(f"/controller/paste/{r_model.id}")
    assert response.status_code == 200

    r_json = response.json()
    r_json["created"] = datetime.fromtimestamp(r_json["created"])

    PasteModel(**r_json)

    yield r_model

    response = client.delete(f"/controller/paste/{r_model.id}/{r_model.owner_secret}")
    assert response.status_code == deletion_status


@pytest.mark.parametrize("deletion_status", [204])
def test_valid_paste(create_paste: PasteCreatedModel) -> None:
    pass


@pytest.mark.parametrize("deletion_status", [204])
def test_delete_invalid_id_paste(
    create_paste: PasteCreatedModel, client: TestClient
) -> None:
    response = client.delete(f"/controller/paste/123/{create_paste.owner_secret}")
    assert response.status_code == 404


@pytest.mark.parametrize("deletion_status", [204])
def test_delete_invalid_secret_paste(
    create_paste: PasteCreatedModel, client: TestClient
) -> None:
    response = client.delete(f"/controller/paste/{create_paste.id}/invalid-code")
    assert response.status_code == 401


@pytest.mark.parametrize("deletion_status", [204])
def test_update_invalid_secret_paste(
    create_paste: PasteCreatedModel, client: TestClient
) -> None:
    response = client.post(
        f"/controller/paste/{create_paste.id}/invalid-code",
        json={"expires_in_hours": -1},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("deletion_status", [204])
def test_update_invalid_id_paste(
    create_paste: PasteCreatedModel, client: TestClient
) -> None:
    response = client.post(
        f"/controller/paste/123/{create_paste.owner_secret}",
        json={"expires_in_hours": -1},
    )
    assert response.status_code == 404


def test_get_invalid_id_paste(client: TestClient) -> None:
    response = client.get(f"/controller/paste/123")
    assert response.status_code == 404


@pytest.mark.parametrize("deletion_status", [404])
def test_valid_delete_after_x_time(
    create_paste: PasteCreatedModel, client: TestClient
) -> None:
    response = client.post(
        f"/controller/paste/{create_paste.id}/{create_paste.owner_secret}",
        json={"expires_in_hours": 0.001111},
    )
    assert response.status_code == 201

    response = client.get(f"/controller/paste/{create_paste.id}")
    assert response.status_code == 200

    time.sleep(5.0)

    response = client.get(f"/controller/paste/{create_paste.id}")
    assert response.status_code == 404


@pytest.mark.parametrize("deletion_status", [404])
def test_valid_delete_after_view(
    create_paste: PasteCreatedModel, client: TestClient
) -> None:
    response = client.post(
        f"/controller/paste/{create_paste.id}/{create_paste.owner_secret}",
        json={"expires_in_hours": -1},
    )
    assert response.status_code == 201

    response = client.get(f"/controller/paste/{create_paste.id}")
    assert response.status_code == 200

    response = client.get(f"/controller/paste/{create_paste.id}")
    assert response.status_code == 404
