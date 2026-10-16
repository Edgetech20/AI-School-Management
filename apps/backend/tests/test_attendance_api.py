import datetime as dt

from fastapi.testclient import TestClient

from app.core.timezone import now_ist_naive
from app.repositories.recognition_reviews import RecognitionReviewRepository


def _auth_headers(client: TestClient) -> dict[str, str]:
    login = client.post("/api/v1/auth/login", json={"username": "admin", "password": "Admin@123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_student_attendance_checkin_checkout_flow(client: TestClient) -> None:
    headers = _auth_headers(client)

    create_student = client.post(
        "/api/v1/students",
        headers=headers,
        json={
            "name": "Anaya Singh",
            "class_name": "10-A",
            "roll_number": "10A-01",
            "parent_phone": "+911234567890",
            "parent_email": "parent.anaya@example.com",
        },
    )
    assert create_student.status_code == 201
    student_id = create_student.json()["id"]

    check_in = client.post(
        "/api/v1/attendance/event",
        headers=headers,
        json={"student_id": student_id, "timestamp": "2026-03-19T08:55:00", "event_type": "check_in"},
    )
    assert check_in.status_code == 200
    assert check_in.json()["status"] == "Pending"

    check_out = client.post(
        "/api/v1/attendance/event",
        headers=headers,
        json={"student_id": student_id, "timestamp": "2026-03-19T15:30:00", "event_type": "check_out"},
    )
    assert check_out.status_code == 200
    assert check_out.json()["status"] == "Present"

    logs = client.get("/api/v1/attendance", headers=headers)
    assert logs.status_code == 200
    assert len(logs.json()) == 1


def test_admin_can_approve_review_queue_entry(client: TestClient, db_session) -> None:
    headers = _auth_headers(client)

    create_student = client.post(
        "/api/v1/students",
        headers=headers,
        json={
            "name": "Ria Sharma",
            "class_name": "10-A",
            "roll_number": "10A-99",
            "parent_phone": "+911112223334",
            "parent_email": "parent.ria@example.com",
        },
    )
    assert create_student.status_code == 201
    student_id = create_student.json()["id"]

    repo = RecognitionReviewRepository(db_session)
    row = repo.create_pending(
        student_id=student_id,
        event_type="check_in",
        device_id="gate-main",
        confidence=0.93,
        margin=0.05,
        embedding=[0.1] * 128,
        expires_at=now_ist_naive() + dt.timedelta(hours=2),
        image_dir="tmp/review_faces_tests",
        frame_blob=b"image-bytes",
    )

    listing = client.get("/api/v1/attendance/recognition/review-queue", headers=headers)
    assert listing.status_code == 200

    approve = client.post(
        f"/api/v1/attendance/recognition/review-queue/{row.id}/approve",
        headers=headers,
        json={"note": "Approved by test"},
    )
    assert approve.status_code == 200
    assert approve.json()["approved"] is True
