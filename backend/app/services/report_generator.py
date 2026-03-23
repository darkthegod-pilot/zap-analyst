import logging
import re
from datetime import datetime, date, timedelta
from typing import Optional

import pytz
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.client import Client
from app.models.receipt import Receipt, ReceiptStatus
from app.services import zapi

logger = logging.getLogger(__name__)
settings = get_settings()

BRT = pytz.timezone("America/Sao_Paulo")


def _parse_amount(s: Optional[str]) -> float:
    if not s:
        return 0.0
    cleaned = s.replace("R$", "").replace(".", "").replace(",", ".").strip()
    m = re.search(r"[\d.]+", cleaned)
    try:
        return float(m.group()) if m else 0.0
    except ValueError:
        return 0.0


def _fmt_brl(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _period_summary(db: Session, start: datetime, end: datetime) -> dict:
    receipts = (
        db.query(Receipt)
        .filter(Receipt.received_at >= start, Receipt.received_at < end)
        .all()
    )
    approved = [r for r in receipts if r.status == ReceiptStatus.approved]
    amounts = [
        _parse_amount(r.analysis.amount)
        for r in approved
        if r.analysis and r.analysis.amount
    ]
    return {
        "count":  len(approved),
        "total":  round(sum(amounts), 2),
    }


def build_daily_report(db: Session, target_date: Optional[date] = None) -> str:
    today = datetime.now(BRT).date()
    if target_date is None:
        target_date = today

    yesterday   = target_date - timedelta(days=1)
    month_start = target_date.replace(day=1)

    def rng(d: date):
        s = datetime.combine(d, datetime.min.time())
        return s, s + timedelta(days=1)

    td_s, td_e = rng(target_date)
    yd_s, yd_e = rng(yesterday)
    mo_s = datetime.combine(month_start, datetime.min.time())
    mo_e = datetime.combine(target_date, datetime.min.time()) + timedelta(days=1)

    hoje = _period_summary(db, td_s, td_e)
    ontem = _period_summary(db, yd_s, yd_e)
    mes   = _period_summary(db, mo_s, mo_e)

    now_str = datetime.now(BRT).strftime("%H:%M")
    date_str = target_date.strftime("%d/%m/%Y")

    lines = [
        f"📊 *DarkCred — {date_str} {now_str}*",
        "",
        f"📅 Hoje: *{hoje['count']} pagamento{'s' if hoje['count'] != 1 else ''}* — *{_fmt_brl(hoje['total'])}*",
        f"📆 Ontem: *{ontem['count']} pagamento{'s' if ontem['count'] != 1 else ''}* — *{_fmt_brl(ontem['total'])}*",
        f"🗓 Mês: *{mes['count']} pagamento{'s' if mes['count'] != 1 else ''}* — *{_fmt_brl(mes['total'])}*",
        "",
        "_DarkCred ZAP Analyst_",
    ]

    return "\n".join(lines)


async def send_daily_report(db: Session) -> None:
    try:
        report = build_daily_report(db)
        success = await zapi.send_text(settings.admin_phone, report)
        if success:
            logger.info("Daily report sent to admin")
        else:
            logger.warning("Failed to send daily report")
    except Exception as e:
        logger.error(f"send_daily_report error: {e}")
