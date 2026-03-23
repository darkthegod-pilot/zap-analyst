import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

logger = logging.getLogger(__name__)
BRT = pytz.timezone("America/Sao_Paulo")

_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone=BRT)
    return _scheduler


def start_scheduler(db_factory):
    """Start APScheduler with daily midnight report job and missed-payment job."""
    from app.services.report_generator import send_daily_report
    from app.services.score_calculator import mark_missed_payments

    scheduler = get_scheduler()

    async def _daily_job():
        db = db_factory()
        try:
            await send_daily_report(db)
        finally:
            db.close()

    def _missed_payments_job():
        db = db_factory()
        try:
            mark_missed_payments(db)
        finally:
            db.close()

    scheduler.add_job(
        _daily_job,
        trigger=CronTrigger(hour=0, minute=0, timezone=BRT),
        id="daily_report",
        replace_existing=True,
        max_instances=1,
        name="Daily WhatsApp Report",
    )

    scheduler.add_job(
        _missed_payments_job,
        trigger=CronTrigger(hour=23, minute=59, day_of_week="mon-sat", timezone=BRT),
        id="missed_payments",
        replace_existing=True,
        max_instances=1,
        name="Mark Missed Payments",
    )

    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started — daily report at 00:00 BRT, missed payments at 23:59 BRT (Mon–Sat)")


def stop_scheduler():
    scheduler = get_scheduler()
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
