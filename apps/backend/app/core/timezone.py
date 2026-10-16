import datetime as dt
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


def now_ist_naive() -> dt.datetime:
    return dt.datetime.now(IST).replace(tzinfo=None)


def to_ist_naive(value: dt.datetime) -> dt.datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(IST).replace(tzinfo=None)
