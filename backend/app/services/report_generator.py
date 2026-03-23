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


def _period_stats(db: Session, start: datetime, end: datetime) -> dict:
    """Compute stats for a given datetime range."""
    receipts = (
        db.query(Receipt)
        .filter(Receipt.received_at >= start, Receipt.received_at < end)
        .all()
    )
    approved   = [r for r in receipts if r.status == ReceiptStatus.approved]
    rejected   = [r for r in receipts if r.status == ReceiptStatus.rejected]
    suspicious = [r for r in receipts if r.status == ReceiptStatus.suspicious]
    pending    = [r for r in receipts if r.status == ReceiptStatus.pending]
    duplicates = [r for r in receipts if r.is_duplicate]

    amounts = [
        _parse_amount(r.analysis.amount)
        for r in approved
        if r.analysis and r.analysis.amount
    ]
    total_amount = round(sum(amounts), 2)
    avg_amount   = round(total_amount / len(amounts), 2) if amounts else 0.0

    return {
        "receipts":    receipts,
        "approved":    approved,
        "rejected":    rejected,
        "suspicious":  suspicious,
        "pending":     pending,
        "duplicates":  duplicates,
        "total":       len(receipts),
        "n_approved":  len(approved),
        "n_rejected":  len(rejected),
        "n_suspicious":len(suspicious),
        "n_pending":   len(pending),
        "n_duplicates":len(duplicates),
        "total_amount":total_amount,
        "avg_amount":  avg_amount,
        "auto_approved": sum(1 for r in approved if r.auto_processed),
    }


def build_daily_report(db: Session, target_date: Optional[date] = None) -> str:
    """
    Build a multi-period WhatsApp report covering:
      - Hoje (target_date)
      - Ontem
      - Mês atual (1º até hoje)
    """
    today = datetime.now(BRT).date()
    if target_date is None:
        target_date = today

    yesterday = target_date - timedelta(days=1)
    month_start = target_date.replace(day=1)

    def dt_range(d: date):
        s = datetime.combine(d, datetime.min.time())
        return s, s + timedelta(days=1)

    today_s, today_e   = dt_range(target_date)
    yest_s,  yest_e    = dt_range(yesterday)
    month_s            = datetime.combine(month_start, datetime.min.time())
    month_e            = datetime.combine(target_date, datetime.min.time()) + timedelta(days=1)

    st_today  = _period_stats(db, today_s, today_e)
    st_yest   = _period_stats(db, yest_s,  yest_e)
    st_month  = _period_stats(db, month_s, month_e)

    # Client data for today's detailed list
    all_ids = {r.client_id for r in st_today["receipts"] if r.client_id}
    client_map = {
        c.id: c
        for c in db.query(Client).filter(Client.id.in_(all_ids)).all()
    } if all_ids else {}

    total_clients  = db.query(Client).count()
    active_clients = db.query(Client).filter(Client.active == True).count()
    calote_clients = db.query(Client).filter(Client.calote == True).count()

    date_str = target_date.strftime("%d/%m/%Y")
    now_str  = datetime.now(BRT).strftime("%H:%M")

    lines = [
        f"📊 *Relatório DarkCred*",
        f"_{date_str} — {now_str} BRT_",
        "",
    ]

    # ── HOJE ─────────────────────────────────────────────────
    lines += [
        "━━━━━━━━━━━━━━━━━━━━━━━━",
        "📅 *HOJE*",
        f"✅ Pagamentos: *{st_today['n_approved']}*",
        f"💰 Total: *{_fmt_brl(st_today['total_amount'])}*",
    ]
    if st_today["avg_amount"] > 0:
        lines.append(f"📈 Ticket médio: {_fmt_brl(st_today['avg_amount'])}")
    lines += [
        f"🤖 Auto-aprovados: {st_today['auto_approved']}",
        f"❌ Rejeitados: {st_today['n_rejected']}",
        f"⚠️ Suspeitos: {st_today['n_suspicious']}",
        f"⏳ Pendentes: {st_today['n_pending']}",
        f"📬 Total comprovantes: {st_today['total']}",
    ]
    if st_today["n_duplicates"]:
        lines.append(f"🔁 Duplicatas: {st_today['n_duplicates']}")

    # Detalhamento dos aprovados de hoje
    if st_today["approved"]:
        lines.append("")
        lines.append("💳 *Pagamentos de hoje:*")
        for r in sorted(st_today["approved"], key=lambda x: x.received_at):
            c   = client_map.get(r.client_id)
            name = (c.name or "Sem nome") if c else "Desconhecido"
            phone = c.phone if c else "—"
            amt  = (r.analysis.amount if r.analysis and r.analysis.amount else "—")
            t    = r.received_at.strftime("%H:%M")
            bot  = " 🤖" if r.auto_processed else ""
            lines.append(f"  • {name} ({phone}) — {amt} às {t}{bot}")

    # Aguardando revisão hoje
    need_review = st_today["suspicious"] + st_today["pending"]
    if need_review:
        lines.append("")
        lines.append("🚨 *Aguardando revisão (hoje):*")
        for r in need_review:
            c    = client_map.get(r.client_id)
            name  = (c.name or "Sem nome") if c else "Desconhecido"
            phone = c.phone if c else "—"
            icon  = "⚠️" if r.status == ReceiptStatus.suspicious else "⏳"
            amt   = (r.analysis.amount if r.analysis and r.analysis.amount else "")
            amt_s = f" — {amt}" if amt else ""
            t     = r.received_at.strftime("%H:%M")
            lines.append(f"  {icon} {name} ({phone}){amt_s} às {t}")

    # ── ONTEM ─────────────────────────────────────────────────
    lines += [
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━",
        f"📆 *ONTEM* ({yesterday.strftime('%d/%m')})",
        f"✅ Pagamentos: *{st_yest['n_approved']}*",
        f"💰 Total: *{_fmt_brl(st_yest['total_amount'])}*",
    ]
    if st_yest["avg_amount"] > 0:
        lines.append(f"📈 Ticket médio: {_fmt_brl(st_yest['avg_amount'])}")
    lines += [
        f"❌ Rejeitados: {st_yest['n_rejected']}",
        f"⚠️ Suspeitos: {st_yest['n_suspicious']}",
        f"📬 Total comprovantes: {st_yest['total']}",
    ]

    # ── MÊS ──────────────────────────────────────────────────
    month_label = target_date.strftime("%B/%Y").capitalize()
    lines += [
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━",
        f"📊 *MÊS* ({month_start.strftime('%d/%m')} → {target_date.strftime('%d/%m')})",
        f"✅ Pagamentos: *{st_month['n_approved']}*",
        f"💰 Total: *{_fmt_brl(st_month['total_amount'])}*",
    ]
    if st_month["avg_amount"] > 0:
        lines.append(f"📈 Ticket médio: {_fmt_brl(st_month['avg_amount'])}")
    lines += [
        f"🤖 Auto-aprovados: {st_month['auto_approved']}",
        f"❌ Rejeitados: {st_month['n_rejected']}",
        f"⚠️ Suspeitos: {st_month['n_suspicious']}",
        f"📬 Total comprovantes: {st_month['total']}",
    ]
    if st_month["n_duplicates"]:
        lines.append(f"🔁 Duplicatas bloqueadas: {st_month['n_duplicates']}")

    # ── CLIENTES ─────────────────────────────────────────────
    lines += [
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━",
        f"👥 Clientes: *{active_clients}* ativos / {total_clients} total",
    ]
    if calote_clients:
        lines.append(f"🚩 Calote: *{calote_clients}* cliente{'s' if calote_clients != 1 else ''}")

    lines += [
        "",
        "_DarkCred ZAP Analyst_",
    ]

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
