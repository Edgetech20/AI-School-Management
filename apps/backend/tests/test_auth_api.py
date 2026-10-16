from fastapi.testclient import TestClient


def _get_token(client: TestClient) -> str:
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "Admin@123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_login_and_me(client: TestClient) -> None:
    token = _get_token(client)

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "admin"


def test_protected_route_requires_token(client: TestClient) -> None:
    response = client.get("/api/v1/students")
    assert response.status_code == 401


def test_protected_route_allows_admin(client: TestClient) -> None:
    token = _get_token(client)

    response = client.get("/api/v1/students", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)
