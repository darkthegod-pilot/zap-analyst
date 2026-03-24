"""Timezone utilities for BRT ↔ UTC conversions.

All timestamps in the database are stored as naive UTC (via datetime.utcnow()).
When filtering by calendar date in BRT (São Paulo, UTC-3), we must convert the
BRT day boundary to UTC before comparing with stored timestamps.

Example: "today" in BRT (2026-03-24) starts at 00:00 BRT = 03:00 UTC.
Without this conversion, the filter window is shifted 3 hours too early.
"""
from datetime import datetime, date, timedelta
import pytz

BRT = pytz.timezone("America/Sao_Paulo")


def brt_day_start_utc(d: date) -> datetime:
    """Return the UTC naive datetime that corresponds to BRT midnight on *d*."""
    brt_midnight = BRT.localize(datetime.combine(d, datetime.min.time()))
    return brt_midnight.astimezone(pytz.UTC).replace(tzinfo=None)


def brt_day_end_utc(d: date) -> datetime:
    """Return the UTC naive datetime that corresponds to the end of BRT day *d*
    (i.e. the start of the next BRT day)."""
    return brt_day_start_utc(d + timedelta(days=1))
