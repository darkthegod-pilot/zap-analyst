import logging
import re
from datetime import datetime, date, timedelta
from typing import Optional

import pytz
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.client import Client
from app.models.receipt import Receipt, Analysis, ReceiptStatus
from app.services import zapi

logger = logging.getLogger(__name__)
settings = get_settings()

BRT = pytz.timezone("America/Sao_Paulo")


def _format_brl(amount_str: Optional[str]) -> str:
    """Try to extract numeric value from amount string."""
    if not amount_str:
        return "R$ 0,00"
    return amount_str


def _parse_amount(s: Optional[str]) -> float:
    if not s:
        return 0.0
    cleaned = s.replace("R$", "").replace(".", "").replace(",", ".").strip()
    m = re.search(r"[\d.]+", cleaned)
    try:
        return float(m.group()) if m else 0.0
    except ValueError:
        return 0.0


def build_daily_report(db: Session, target_date: Optional[date] = None) -> str:
    if target_date is None:
        target_date = datetime.now(BRT).date()

    start = datetime.combine(target_date, datetime.min.time())
    end = start + timedelta(days=1)

    receipts = (
        db.query(Receipt)
        .filter(Receipt.received_at >= start, Receipt.received_at < end)
        .all()
    )

    total = len(receipts)
    approved = sum(1 for r in receipts if r.status == ReceiptStatus.approved)
    rejected = sum(1 for r in receipts if r.status == ReceiptStatus.rejected)
    suspicious = sum(1 for r in receipts if r.status == ReceiptStatus.suspicious)
    pending = sum(1 for r in receipts if r.status == ReceiptStatus.pending)

    # Calculate total R$ from approved receipts
    approved_receipts = [r for r in receipts if r.status == ReceiptStatus.approved]
    total_amount = sum(
        _parse_amount(r.analysis.amount)
        for r in approved_receipts
        if r.analysis and r.analysis.amount
    )
    amount_str = f"R$ {total_amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    # Collect pending/suspicious clients for mention
    need_review = [
        r for r in receipts if r.status in (ReceiptStatus.suspicious, ReceiptStatus.pending)
    ]
    client_ids = {r.client_id for r in need_review}
    clients = db.query(Client).filter(Client.id.in_(client_ids)).all()
    client_map = {c.id: c for c in clients}

    date_str = target_date.strftime("%d/%m/%Y")
    lines = [
        f"📊 *Relatório DarkCred — {date_str}*",
        "",
        f"✅ Aprovados: {approved}",
        f"💰 Total recebido: {amount_str}",
        f"❌ Rejeitados: {rejected}",
        f"⚠️ Suspeitos/Revisão: {suspicious}",
        f"⏳ Pendentes: {pending}",
        f"📬 Comprovantes: {total}",
    ]

    if need_review:
        lines.append("")
        lines.append("🔍 *Aguardando revisão manual:*")
        for r in need_review:
            c = client_map.get(r.client_id)
            if c:
                name = c.name or "Sem nome"
                lines.append(f"• {name} — {c.phone}")

    total_clients = db.query(Client).count()
    active_clients = db.query(Client).filter(Client.active == True).count()
    lines.append("")
    lines.append(f"👥 Clientes monitorados: {active_clients}/{total_clients}")
    lines.append("")
    lines.append("_DarkCred ZAP Analyst_")

    return "\n".join(lines)


async def send_daily_report(db: Session) -> None:
    """Generate and send daily report to admin via WhatsApp."""
    try:
        report = build_daily_report(db)
        success = await zapi.send_text(settings.admin_phone, report)
        if success:
            logger.info("Daily report sent to admin")
        else:
            logger.warning("Failed to send daily report")
    except Exception as e:
        logger.error(f"send_daily_report error: {e}")
