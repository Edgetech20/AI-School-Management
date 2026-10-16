import datetime as dt

from app.services.attendance.rule_engine import calculate_status


def test_status_present_when_on_time_with_sufficient_hours() -> None:
    check_in = dt.datetime(2026, 3, 19, 8, 55)
    check_out = dt.datetime(2026, 3, 19, 15, 30)

    status = calculate_status(check_in, check_out, "09:00", "09:15", 6.0)
    assert status == "Present"


def test_status_late_when_within_late_threshold() -> None:
    check_in = dt.datetime(2026, 3, 19, 9, 10)
    check_out = dt.datetime(2026, 3, 19, 15, 30)

    status = calculate_status(check_in, check_out, "09:00", "09:15", 6.0)
    assert status == "Late"


def test_status_absent_when_no_checkin() -> None:
    status = calculate_status(None, None, "09:00", "09:15", 6.0)
    assert status == "Absent"


def test_status_present_with_zero_minimum_hours() -> None:
    check_in = dt.datetime(2026, 3, 19, 8, 55)
    check_out = dt.datetime(2026, 3, 19, 9, 0)

    status = calculate_status(check_in, check_out, "09:00", "09:15", 0.0)
    assert status == "Present"


def test_status_late_with_zero_minimum_hours() -> None:
    check_in = dt.datetime(2026, 3, 19, 9, 20)
    check_out = dt.datetime(2026, 3, 19, 9, 25)

    status = calculate_status(check_in, check_out, "09:00", "09:15", 0.0)
    assert status == "Late"
