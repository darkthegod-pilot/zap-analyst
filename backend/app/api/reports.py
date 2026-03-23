from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from openai import AsyncOpenAI

from app.core.config import get_settings
from app.models.database import get_db
from app.schemas.receipt import ReportRequest
from app.services.report_generator import build_daily_report, send_daily_report
from app.services import zapi

router = APIRouter(prefix="/reports", tags=["reports"])
settings = get_settings()

INTERPRET_PROMPT = """Você é um assistente do sistema DarkCred. O usuário pediu um relatório.
Interprete a mensagem e retorne APENAS um JSON:
{"period": "today" | "yesterday" | "week" | "month", "send_whatsapp": true | false}

Exemplos:
- "relatório de hoje" → {"period": "today", "send_whatsapp": false}
- "manda relatório no zap" → {"period": "today", "send_whatsapp": true}
- "relatório de ontem" → {"period": "yesterday", "send_whatsapp": false}
- "envia o relatório semanal no whatsapp" → {"period": "week", "send_whatsapp": true}

Mensagem do usuário: """


@router.post("/request")
async def request_report(
    body: ReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Interpret natural language and generate the requested report."""
    period = "today"
    send_whatsapp = False

    if settings.openai_api_key:
        try:
            client = AsyncOpenAI(api_key=settings.openai_api_key)
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
        background_tasks.add_task(zapi.send_text, settings.admin_phone, report_text)

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
    from datetime import timedelta
    today = datetime.utcnow().date()
    if period == "yesterday":
        return today - timedelta(days=1)
    return today
