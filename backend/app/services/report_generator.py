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


def _fmt_brl(value: float) -> str:
    """Format float as Brazilian Real string."""
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


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
    approved_receipts  = [r for r in receipts if r.status == ReceiptStatus.approved]
    rejected_receipts  = [r for r in receipts if r.status == ReceiptStatus.rejected]
    suspicious_receipts= [r for r in receipts if r.status == ReceiptStatus.suspicious]
    pending_receipts   = [r for r in receipts if r.status == ReceiptStatus.pending]
    duplicate_receipts = [r for r in receipts if r.is_duplicate]

    approved   = len(approved_receipts)
    rejected   = len(rejected_receipts)
    suspicious = len(suspicious_receipts)
    pending    = len(pending_receipts)
    duplicates = len(duplicate_receipts)

    auto_approved  = sum(1 for r in approved_receipts if r.auto_processed)
    manual_approved = approved - auto_approved

    # Calcular totais de valor
    amounts = [
        _parse_amount(r.analysis.amount)
        for r in approved_receipts
        if r.analysis and r.analysis.amount
    ]
    total_amount = round(sum(amounts), 2)
    avg_amount   = round(total_amount / len(amounts), 2) if amounts else 0.0

    # Carregar todos os clientes envolvidos
    all_client_ids = {r.client_id for r in receipts if r.client_id}
    clients = db.query(Client).filter(Client.id.in_(all_client_ids)).all()
    client_map = {c.id: c for c in clients}

    total_clients  = db.query(Client).count()
    active_clients = db.query(Client).filter(Client.active == True).count()
    calote_clients = db.query(Client).filter(Client.calote == True).count()

    date_str = target_date.strftime("%d/%m/%Y")
    now_str  = datetime.now(BRT).strftime("%H:%M")

    lines = [
        f"📊 *Relatório DarkCred — {date_str}*",
        f"_Gerado às {now_str} (BRT)_",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━",
        f"✅ Aprovados: *{approved}*",
        f"💰 Total recebido: *{_fmt_brl(total_amount)}*",
    ]

    if avg_amount > 0:
        lines.append(f"📈 Ticket médio: *{_fmt_brl(avg_amount)}*")

    lines += [
        f"🤖 Auto-aprovados: {auto_approved}",
        f"👤 Aprovação manual: {manual_approved}",
        "",
        f"❌ Rejeitados: {rejected}",
        f"⚠️ Suspeitos: {suspicious}",
        f"⏳ Pendentes: {pending}",
        f"📬 Total comprovantes: {total}",
    ]

    if duplicates:
        lines.append(f"🔁 Duplicatas bloqueadas: {duplicates}")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━━━")

    # ── Lista detalhada de aprovados ──────────────────────────
    if approved_receipts:
        lines.append("")
        lines.append("💳 *Pagamentos confirmados:*")
        for r in sorted(approved_receipts, key=lambda x: x.received_at):
            c = client_map.get(r.client_id)
            name    = (c.name or "Sem nome") if c else "Desconhecido"
            phone   = c.phone if c else "—"
            amt     = (r.analysis.amount if r.analysis and r.analysis.amount else "—")
            time_s  = r.received_at.strftime("%H:%M")
            auto    = " 🤖" if r.auto_processed else ""
            lines.append(f"• {name} ({phone}) — {amt} às {time_s}{auto}")

    # ── Rejeitados com motivo ─────────────────────────────────
    real_rejected = [r for r in rejected_receipts if not r.is_duplicate]
    if real_rejected:
        lines.append("")
        lines.append("❌ *Comprovantes rejeitados:*")
        for r in real_rejected:
            c = client_map.get(r.client_id)
            name  = (c.name or "Sem nome") if c else "Desconhecido"
            phone = c.phone if c else "—"
            note  = r.notes or "Rejeitado manualmente"
            # Truncar nota longa
            if len(note) > 60:
                note = note[:57] + "..."
            lines.append(f"• {name} ({phone}) — {note}")

    if duplicate_receipts:
        lines.append("")
        lines.append("🔁 *Duplicatas bloqueadas:*")
        for r in duplicate_receipts:
            c = client_map.get(r.client_id)
            name  = (c.name or "Sem nome") if c else "Desconhecido"
            phone = c.phone if c else "—"
            lines.append(f"• {name} ({phone}) — comprovante duplicado")

    # ── Aguardando revisão ───────────────────────────────────
    need_review = suspicious_receipts + pending_receipts
    if need_review:
        lines.append("")
        lines.append("🚨 *Aguardando revisão manual:*")
        for r in need_review:
            c = client_map.get(r.client_id)
            if c:
                name  = c.name or "Sem nome"
                phone = c.phone
                icon  = "⚠️" if r.status == ReceiptStatus.suspicious else "⏳"
                amt   = (r.analysis.amount if r.analysis and r.analysis.amount else "")
                amt_s = f" — {amt}" if amt else ""
                time_s = r.received_at.strftime("%H:%M")
                lines.append(f"{icon} {name} ({phone}){amt_s} às {time_s}")

    # ── Resumo de clientes ───────────────────────────────────
    lines.append("")
    lines.append("━━━━━━━━━━━━━━━━━━━━━━━━")
    lines.append(f"👥 Clientes: {active_clients} ativos / {total_clients} total")
    if calote_clients:
        lines.append(f"🚩 Calote: *{calote_clients}* cliente{'s' if calote_clients != 1 else ''}")

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
