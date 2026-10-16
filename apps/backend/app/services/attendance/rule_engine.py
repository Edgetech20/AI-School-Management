import datetime as dt


def parse_hhmm(value: str) -> dt.time:
    return dt.datetime.strptime(value, "%H:%M").time()


def calculate_status(
    check_in: dt.datetime | None,
    check_out: dt.datetime | None,
    school_start_time: str,
    late_threshold_time: str,
    minimum_hours: float,
) -> str:
    if not check_in or not check_out:
        return "Absent"

    if check_out < check_in:
        return "Absent"

    start = parse_hhmm(school_start_time)
    late_threshold = parse_hhmm(late_threshold_time)
    worked_hours = (check_out - check_in).total_seconds() / 3600
    if minimum_hours <= 0:
        minimum_hours = 0.0
        half_day_hours = 0.0
    else:
        half_day_hours = max(1.0, minimum_hours * 0.5)

    if worked_hours < half_day_hours:
        return "Absent"
    if worked_hours < minimum_hours:
        return "Half-day"

    if check_in.time() > late_threshold:
        return "Late"
    if check_in.time() > start:
        return "Late"

    return "Present"
