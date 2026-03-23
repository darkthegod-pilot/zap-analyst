"""
Score calculator for client payment tracking.

Rules:
- Payment days: Monday–Saturday (Sunday = free day)
- Cutoff time: 18:00 BRT → paid after = "paid_late"
- Approved receipt on time  → streak +1, score += min(streak*2, 20)
- Approved receipt late     → streak -1 (min 0), score -10
- No receipt by 23:59       → streak = 0, score -50
- Score floor: 0, cap: 1000
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
CUTOFF_HOUR = 18   # 18:00 BRT = late threshold


def is_payment_day(d: date) -> bool:
    """Monday (0) through Saturday (5) are payment days."""
    return d.weekday() != 6  # 6 = Sunday


def on_receipt_approved(receipt_id: int, db: Session) -> None:
    """
    Called whenever a receipt is approved (auto or manual).
    Updates the client's score, streak and DailyPayment record.
    """
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        return

    brt_now  = datetime.now(BRT)
    pay_date = brt_now.date()

    if not is_payment_day(pay_date):
        return

    # Check if we already recorded a successful payment for this client today
    existing = db.query(DailyPayment).filter(
        DailyPayment.client_id == receipt.client_id,
        DailyPayment.payment_date == pay_date,
    ).first()

    if existing and existing.status in ("paid_on_time", "paid_late"):
        return  # already credited

    is_late = brt_now.hour >= CUTOFF_HOUR
    status  = "paid_late" if is_late else "paid_on_time"

    if existing:
        existing.status     = status
        existing.receipt_id = receipt.id
        existing.penalty    = 0
    else:
        dp = DailyPayment(
            client_id    = receipt.client_id,
            payment_date = pay_date,
            status       = status,
            receipt_id   = receipt.id,
            penalty      = 0,
        )
        db.add(dp)

    client = db.query(Client).filter(Client.id == receipt.client_id).first()
    if not client:
        db.commit()
        return

    if not is_late:
        client.streak = (client.streak or 0) + 1
        bonus          = min((client.streak or 1) * 2, 20)
        client.score   = min(1000, (client.score or 1000) + bonus)
        logger.info(f"Client {client.id} paid on time — streak={client.streak}, score={client.score}")
    else:
        client.streak = max(0, (client.streak or 0) - 1)
        client.score  = max(0,  (client.score  or 1000) - 10)
        logger.info(f"Client {client.id} paid LATE — streak={client.streak}, score={client.score}")

    db.commit()


def mark_missed_payments(db: Session) -> None:
    """
    Run at 23:59 BRT on Mon–Sat.
    For every active, non-frozen client with no successful payment today,
    create a 'missed' record and apply penalty.
    """
    today = datetime.now(BRT).date()

    if not is_payment_day(today):
        logger.info("mark_missed_payments: today is Sunday — skipping")
        return

    active_clients = db.query(Client).filter(
        Client.active == True,
        Client.frozen == False,
    ).all()

    missed = 0
    for client in active_clients:
        existing = db.query(DailyPayment).filter(
            DailyPayment.client_id   == client.id,
            DailyPayment.payment_date == today,
        ).first()

        if existing and existing.status in ("paid_on_time", "paid_late"):
            continue  # already paid

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

        client.streak = 0
        client.score  = max(0, (client.score or 1000) - 50)
        missed += 1
        logger.info(f"Client {client.id} MISSED payment — score={client.score}")

    db.commit()
    logger.info(f"mark_missed_payments: {missed} clients penalised")
