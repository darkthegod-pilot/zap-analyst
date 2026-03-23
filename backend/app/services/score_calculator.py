"""
Score calculator for client payment tracking.

New tiered rules (BRT timezone):
- Payment window: Monday–Saturday (Sunday = free day)
- Before 12:00 → "paid_early":   streak +1, score +30 + min(streak*3, 30)
- 12:00–15:59  → "paid_on_time": streak +1, score +20 + min(streak*2, 20)
- 16:00–23:58  → "paid_normal":  no streak change, score +5
- 1 day late   → "paid_late":    streak = 0, score -50
- No payment by 23:59 → "missed": streak = 0, score -50
- 7+ consecutive missed days → client flagged as "calote"
- Score: floor 0, cap 1000
"""
import logging
from datetime import datetime, date, timedelta

import pytz
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.receipt import Receipt, ReceiptStatus
from app.models.daily_payment import DailyPayment

logger = logging.getLogger(__name__)
BRT = pytz.timezone("America/Sao_Paulo")

HOUR_EARLY    = 12   # before this hour = early
HOUR_ON_TIME  = 16   # before this hour = on time
CALOTE_DAYS   = 7    # consecutive missed days to flag as calote


def is_payment_day(d: date) -> bool:
    """Monday (0) through Saturday (5) are payment days."""
    return d.weekday() != 6  # 6 = Sunday


def on_receipt_approved(receipt_id: int, db: Session) -> None:
    """
    Called whenever a receipt is approved (auto or manual).
    Updates the client's score, streak and DailyPayment record.

    Also handles "1 day late" scenario: if today is a payment day but the
    client's last missed day was yesterday, this counts as paid_late.
    """
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        return

    brt_now  = datetime.now(BRT)
    today    = brt_now.date()
    hour     = brt_now.hour

    # ── Check if this is a late payment from yesterday ─────────────────────
    yesterday = today - timedelta(days=1)
    is_late_payment = False

    if is_payment_day(today):
        pay_date = today
    elif is_payment_day(yesterday):
        # Today is Sunday but yesterday (Saturday) was a payment day — late
        is_late_payment = True
        pay_date = yesterday
    else:
        return  # Neither today nor yesterday is/was a payment day

    # ── Avoid double-crediting ─────────────────────────────────────────────
    existing = db.query(DailyPayment).filter(
        DailyPayment.client_id   == receipt.client_id,
        DailyPayment.payment_date == pay_date,
    ).first()

    if existing and existing.status in ("paid_early", "paid_on_time", "paid_normal", "paid_late"):
        return  # already credited today

    client = db.query(Client).filter(Client.id == receipt.client_id).first()
    if not client:
        db.commit()
        return

    # ── Determine status by hour ───────────────────────────────────────────
    if is_late_payment:
        status  = "paid_late"
        penalty = 50
    elif hour < HOUR_EARLY:
        status  = "paid_early"
        penalty = 0
    elif hour < HOUR_ON_TIME:
        status  = "paid_on_time"
        penalty = 0
    else:
        status  = "paid_normal"
        penalty = 0

    # ── Upsert DailyPayment ────────────────────────────────────────────────
    if existing:
        existing.status     = status
        existing.receipt_id = receipt.id
        existing.penalty    = penalty
    else:
        dp = DailyPayment(
            client_id    = receipt.client_id,
            payment_date = pay_date,
            status       = status,
            receipt_id   = receipt.id,
            penalty      = penalty,
        )
        db.add(dp)

    # ── Update score & streak ──────────────────────────────────────────────
    old_streak = client.streak or 0
    old_score  = client.score  or 1000

    if status == "paid_early":
        client.streak = old_streak + 1
        bonus          = 30 + min(old_streak * 3, 30)
        client.score   = min(1000, old_score + bonus)
    elif status == "paid_on_time":
        client.streak = old_streak + 1
        bonus          = 20 + min(old_streak * 2, 20)
        client.score   = min(1000, old_score + bonus)
    elif status == "paid_normal":
        # No streak change, small bonus
        client.score   = min(1000, old_score + 5)
    elif status == "paid_late":
        client.streak = 0
        client.score   = max(0, old_score - 50)

    # If client was calote, paying removes the flag
    if client.calote:
        client.calote      = False
        client.days_overdue = 0

    logger.info(
        f"Client {client.id} payment status={status} — "
        f"streak={client.streak}, score={client.score}"
    )
    db.commit()


def mark_missed_payments(db: Session) -> None:
    """
    Run at 23:59 BRT on Mon–Sat.
    • Mark all active non-frozen clients without a successful payment today as 'missed'.
    • Increment days_overdue and flag as 'calote' after CALOTE_DAYS consecutive misses.
    """
    today = datetime.now(BRT).date()

    if not is_payment_day(today):
        logger.info("mark_missed_payments: today is Sunday — skipping")
        return

    active_clients = db.query(Client).filter(
        Client.active == True,
        Client.frozen == False,
    ).all()

    missed_count = 0
    calote_count = 0

    for client in active_clients:
        existing = db.query(DailyPayment).filter(
            DailyPayment.client_id    == client.id,
            DailyPayment.payment_date == today,
        ).first()

        if existing and existing.status in ("paid_early", "paid_on_time", "paid_normal", "paid_late"):
            # Paid today — reset days_overdue
            client.days_overdue = 0
            continue

        # Mark as missed
        if existing:
            existing.status  = "missed"
            existing.penalty = 50
        else:
            dp = DailyPayment(
                client_id    = client.id,
                payment_date = today,
                status       = "missed",
                penalty      = 50,
            )
            db.add(dp)

        client.streak      = 0
        client.score       = max(0, (client.score or 1000) - 50)
        client.days_overdue = (client.days_overdue or 0) + 1
        missed_count += 1

        # Flag as calote if overdue for CALOTE_DAYS or more
        if client.days_overdue >= CALOTE_DAYS and not client.calote:
            client.calote = True
            calote_count += 1
            logger.warning(
                f"Client {client.id} ({client.phone}) flagged as CALOTE "
                f"after {client.days_overdue} missed days"
            )

        logger.info(
            f"Client {client.id} MISSED — score={client.score}, "
            f"days_overdue={client.days_overdue}, calote={client.calote}"
        )

    db.commit()
    logger.info(
        f"mark_missed_payments: {missed_count} clients penalised, "
        f"{calote_count} newly flagged as calote"
    )
