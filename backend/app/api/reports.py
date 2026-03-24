import re
from datetime import date, datetime, timedelta
from typing import Optional, List

import pytz
from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from openai import AsyncOpenAI

from app.core.config import get_settings
from app.core.tz import brt_day_start_utc, brt_day_end_utc, BRT as _BRT
from app.models.database import get_db
from app.models.client import Client
from app.models.receipt import Receipt, Analysis, ReceiptStatus
from app.schemas.receipt import ReportRequest
from app.services.report_generator import build_daily_report, send_daily_report
from app.services import zapi


def _parse_amount(s: str | None) -> float:
    """Extract numeric value from amount string like 'R$ 1.500,00'."""
    if not s:
        return 0.0
    cleaned = s.replace("R$", "").replace(".", "").replace(",", ".").strip()
    m = re.search(r"[\d.]+", cleaned)
    try:
        return float(m.group()) if m else 0.0
    except ValueError:
        return 0.0

router = APIRouter(prefix="/reports", tags=["reports"])
settings = get_settings()
BRT = _BRT

INTERPRET_PROMPT = """Você é um assistente do sistema DarkCred. O usuário pediu um relatório.
Interprete a mensagem e retorne APENAS um JSON:
{"period": "today" | "yesterday" | "week" | "month", "send_whatsapp": true | false}

Exemplos:
- "relatório de hoje" → {"period": "today", "send_whatsapp": false}
- "manda relatório no zap" → {"period": "today", "send_whatsapp": true}
- "relatório de ontem" → {"period": "yesterday", "send_whatsapp": false}
- "envia o relatório semanal no whatsapp" → {"period": "week", "send_whatsapp": true}

Mensagem do usuário: """


# ── Summary endpoint ──────────────────────────────────────────────────────────

class DayPoint(BaseModel):
    date: str
    approved: int
    rejected: int
    suspicious: int
    pending: int
    total: int


class HourPoint(BaseModel):
    hour: int
    total: int


class SummaryResponse(BaseModel):
    period: str
    date_from: str
    date_to: str
    total: int
    approved: int
    rejected: int
    suspicious: int
    pending: int
    total_clients: int
    active_clients: int
    calote_clients: int
    auto_approved: int
    duplicates: int
    total_amount: float
    avg_amount: float
    total_profit: float
    daily: List[DayPoint]
    hourly: List[HourPoint]


@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    period: str = "today",
    db: Session = Depends(get_db),
):
    """Structured summary with chart data for a period: today|yesterday|week|month."""
    today = datetime.now(BRT).date()

    if period == "today":
        date_from = today
        date_to   = today
    elif period == "yesterday":
        date_from = today - timedelta(days=1)
        date_to   = today - timedelta(days=1)
    elif period == "week":
        date_from = today - timedelta(days=6)
        date_to   = today
    elif period == "month":
        date_from = today - timedelta(days=29)
        date_to   = today
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Período inválido. Use: today, yesterday, week, month")

    # Convert BRT calendar dates to UTC boundaries (stored timestamps are UTC)
    start_dt = brt_day_start_utc(date_from)
    end_dt   = brt_day_end_utc(date_to)

    base = db.query(Receipt).filter(
        Receipt.received_at >= start_dt,
        Receipt.received_at < end_dt,
    )

    total      = base.count()
    approved   = base.filter(Receipt.status == ReceiptStatus.approved).count()
    rejected   = base.filter(Receipt.status == ReceiptStatus.rejected).count()
    suspicious = base.filter(Receipt.status == ReceiptStatus.suspicious).count()
    pending    = base.filter(Receipt.status == ReceiptStatus.pending).count()
    auto_approved = base.filter(Receipt.auto_processed == True, Receipt.status == ReceiptStatus.approved).count()
    duplicates = base.filter(Receipt.is_duplicate == True).count()

    total_clients  = db.query(Client).count()
    active_clients = db.query(Client).filter(Client.active == True).count()
    calote_clients = db.query(Client).filter(Client.calote == True).count()

    # R$ amount totals (from approved receipts with analysis)
    approved_with_analysis = (
        db.query(Analysis)
        .join(Receipt, Receipt.id == Analysis.receipt_id)
        .filter(
            Receipt.received_at >= start_dt,
            Receipt.received_at < end_dt,
            Receipt.status == ReceiptStatus.approved,
        )
        .all()
    )
    amounts = [_parse_amount(a.amount) for a in approved_with_analysis if a.amount]
    total_amount = round(sum(amounts), 2)
    avg_amount = round(total_amount / len(amounts), 2) if amounts else 0.0
    total_profit = round(total_amount * 0.56, 2)

    # ── Daily breakdown ────────────────────────────────────────────────────
    daily: List[DayPoint] = []
    current = date_from
    while current <= date_to:
        day_start = brt_day_start_utc(current)
        day_end   = brt_day_end_utc(current)
        day_q     = db.query(Receipt).filter(
            Receipt.received_at >= day_start,
            Receipt.received_at < day_end,
        )
        daily.append(DayPoint(
            date=str(current),
            approved=day_q.filter(Receipt.status == ReceiptStatus.approved).count(),
            rejected=day_q.filter(Receipt.status == ReceiptStatus.rejected).count(),
            suspicious=day_q.filter(Receipt.status == ReceiptStatus.suspicious).count(),
            pending=day_q.filter(Receipt.status == ReceiptStatus.pending).count(),
            total=day_q.count(),
        ))
        current += timedelta(days=1)

    # ── Hourly breakdown (only when period = today or yesterday) ───────────
    # Convert received_at (UTC) back to BRT to group by BRT hour
    hourly: List[HourPoint] = []
    if period in ("today", "yesterday"):
        receipts_list = db.query(Receipt).filter(
            Receipt.received_at >= start_dt,
            Receipt.received_at < end_dt,
        ).all()
        hour_map = {}
        for r in receipts_list:
            # Convert stored UTC timestamp to BRT hour
            brt_dt = pytz.UTC.localize(r.received_at).astimezone(BRT)
            h = brt_dt.hour
            hour_map[h] = hour_map.get(h, 0) + 1
        hourly = [HourPoint(hour=h, total=hour_map.get(h, 0)) for h in range(24)]

    return SummaryResponse(
        period=period,
        date_from=str(date_from),
        date_to=str(date_to),
        total=total,
        approved=approved,
        rejected=rejected,
        suspicious=suspicious,
        pending=pending,
        total_clients=total_clients,
        active_clients=active_clients,
        calote_clients=calote_clients,
        auto_approved=auto_approved,
        duplicates=duplicates,
        total_amount=total_amount,
        avg_amount=avg_amount,
        total_profit=total_profit,
        daily=daily,
        hourly=hourly,
    )


# ── Text report endpoints ──────────────────────────────────────────────────────

@router.post("/request")
async def request_report(
    body: ReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Interpret natural language and generate the requested report."""
    period = "today"
    send_whatsapp = False

    from app.api.settings import get_effective_settings
    s = get_effective_settings(db)
    openai_key  = s.get("openai_api_key") or settings.openai_api_key
    admin_phone = s.get("admin_phone")    or settings.admin_phone

    if openai_key:
        try:
            client = AsyncOpenAI(api_key=openai_key)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": INTERPRET_PROMPT + body.message}],
                max_tokens=60,
                temperature=0,
            )
            import json
            raw = resp.choices[0].message.content.strip()
            parsed = json.loads(raw)
            period = parsed.get("period", "today")
            send_whatsapp = parsed.get("send_whatsapp", False)
        except Exception:
            pass

    target_date = _period_to_date(period)
    report_text = build_daily_report(db, target_date)

    if send_whatsapp:
        background_tasks.add_task(zapi.send_text, admin_phone, report_text, s)

    return {
        "report": report_text,
        "period": period,
        "sent_whatsapp": send_whatsapp,
        "date": str(target_date),
    }


@router.post("/send-now")
async def send_report_now(db: Session = Depends(get_db)):
    """Manually trigger the daily report send."""
    await send_daily_report(db)
    return {"ok": True, "message": "Relatório enviado para o WhatsApp do admin"}


def _period_to_date(period: str) -> date:
    today = datetime.now(BRT).date()
    if period == "yesterday":
        return today - timedelta(days=1)
    if period == "week":
        return today - timedelta(days=6)
    if period == "month":
        return today - timedelta(days=29)
    return today


# ── All-time stats ─────────────────────────────────────────────────────────────

class AllTimeResponse(BaseModel):
    total_amount: float
    total_profit: float
    total_approved: int
    total_receipts: int


@router.get("/alltime", response_model=AllTimeResponse)
def get_alltime(db: Session = Depends(get_db)):
    """Aggregated stats for all time — no date filter."""
    total_receipts = db.query(Receipt).count()
    total_approved = db.query(Receipt).filter(Receipt.status == ReceiptStatus.approved).count()
    approved_analyses = (
        db.query(Analysis)
        .join(Receipt, Receipt.id == Analysis.receipt_id)
        .filter(Receipt.status == ReceiptStatus.approved)
        .all()
    )
    amounts = [_parse_amount(a.amount) for a in approved_analyses if a.amount]
    total_amount = round(sum(amounts), 2)
    total_profit = round(total_amount * 0.56, 2)
    return AllTimeResponse(
        total_amount=total_amount,
        total_profit=total_profit,
        total_approved=total_approved,
        total_receipts=total_receipts,
    )


# ── Daily chart with free date range ──────────────────────────────────────────

class DailyChartResponse(BaseModel):
    date_from: str
    date_to: str
    daily: List[DayPoint]
    total_amount: float
    total_profit: float
    total: int
    approved: int


@router.get("/daily-chart", response_model=DailyChartResponse)
def get_daily_chart(
    date_from: str,
    date_to: str,
    db: Session = Depends(get_db),
):
    """Daily breakdown for an arbitrary date range (for the custom chart widget)."""
    from fastapi import HTTPException as _HTTPException
    try:
        df = datetime.strptime(date_from, "%Y-%m-%d").date()
        dt = datetime.strptime(date_to,   "%Y-%m-%d").date()
    except ValueError:
        raise _HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD.")

    if df > dt:
        raise _HTTPException(status_code=400, detail="date_from deve ser anterior a date_to.")
    if (dt - df).days > 366:
        raise _HTTPException(status_code=400, detail="Intervalo máximo: 366 dias.")

    # Convert BRT calendar dates to UTC boundaries
    start_dt = brt_day_start_utc(df)
    end_dt   = brt_day_end_utc(dt)

    base = db.query(Receipt).filter(
        Receipt.received_at >= start_dt,
        Receipt.received_at < end_dt,
    )
    total    = base.count()
    approved = base.filter(Receipt.status == ReceiptStatus.approved).count()

    approved_analyses = (
        db.query(Analysis)
        .join(Receipt, Receipt.id == Analysis.receipt_id)
        .filter(
            Receipt.received_at >= start_dt,
            Receipt.received_at < end_dt,
            Receipt.status == ReceiptStatus.approved,
        )
        .all()
    )
    amounts = [_parse_amount(a.amount) for a in approved_analyses if a.amount]
    total_amount = round(sum(amounts), 2)
    total_profit = round(total_amount * 0.56, 2)

    daily: List[DayPoint] = []
    current = df
    while current <= dt:
        day_start = brt_day_start_utc(current)
        day_end   = brt_day_end_utc(current)
        day_q     = db.query(Receipt).filter(
            Receipt.received_at >= day_start,
            Receipt.received_at < day_end,
        )
        daily.append(DayPoint(
            date=str(current),
            approved=day_q.filter(Receipt.status == ReceiptStatus.approved).count(),
            rejected=day_q.filter(Receipt.status == ReceiptStatus.rejected).count(),
            suspicious=day_q.filter(Receipt.status == ReceiptStatus.suspicious).count(),
            pending=day_q.filter(Receipt.status == ReceiptStatus.pending).count(),
            total=day_q.count(),
        ))
        current += timedelta(days=1)

    return DailyChartResponse(
        date_from=str(df),
        date_to=str(dt),
        daily=daily,
        total_amount=total_amount,
        total_profit=total_profit,
        total=total,
        approved=approved,
    )
