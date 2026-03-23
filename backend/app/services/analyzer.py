import base64
import json
import logging
from datetime import datetime
from pathlib import Path

from openai import AsyncOpenAI
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.receipt import Receipt, Analysis, ReceiptStatus

logger = logging.getLogger(__name__)
settings = get_settings()

ANALYSIS_PROMPT = """Você é um especialista em detecção de fraudes em comprovantes bancários brasileiros.
Analise CUIDADOSAMENTE este comprovante e retorne APENAS um JSON válido (sem markdown, sem explicações extras) com exatamente estes campos:

{
  "is_authentic": true ou false,
  "confidence_score": número de 0.0 a 1.0,
  "bank_name": "nome do banco ou null",
  "amount": "valor em reais (ex: R$ 150,00) ou null",
  "transaction_date": "data no formato DD/MM/AAAA ou null",
  "transaction_id": "código/ID da transação ou null",
  "sender_name": "nome do pagador ou null",
  "recipient_name": "nome do beneficiário ou null",
  "fraud_indicators": ["lista de alertas encontrados, vazia se nenhum"],
  "summary": "resumo em português de no máximo 2 frases"
}

Verifique especificamente:
1. Consistência visual: fontes, espaçamento e alinhamento típicos do banco identificado
2. Artefatos de edição: bordas cortadas, pixels inconsistentes, sombras suspeitas
3. Código de autenticação/ID: formato esperado para o banco (Pix tem 32 hex chars, etc.)
4. Data e hora: não pode ser futura nem muito antiga (> 30 dias é suspeito)
5. Valor: formatação correta em reais, sem zeros excessivos
6. Logo/marca do banco: autêntica vs. distorcida ou substituída
7. Dados faltando: sem ID de transação ou valor = reduzir confidence_score drasticamente
8. Inconsistência nome/banco: dados que não batem entre si

Se não conseguir ler a imagem claramente, retorne confidence_score baixo (< 0.3) e descreva o problema no summary."""


async def analyze_receipt(receipt_id: int, db: Session) -> None:
    """Run GPT-4o Vision analysis on a receipt. Updates DB in place."""
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        logger.error(f"Receipt {receipt_id} not found")
        return

    # Create or get analysis record
    analysis = db.query(Analysis).filter(Analysis.receipt_id == receipt_id).first()
    if not analysis:
        analysis = Analysis(receipt_id=receipt_id)
        db.add(analysis)
        db.commit()

    # Guard: OpenAI key must be configured
    if not settings.openai_api_key:
        analysis.error = "Chave OpenAI não configurada. Configure em Configurações."
        analysis.confidence_score = 0.0
        analysis.is_authentic = False
        analysis.fraud_indicators = ["Análise de IA indisponível: chave não configurada"]
        analysis.ai_summary = "Análise não realizada: configure a chave OpenAI nas Configurações."
        receipt.status = ReceiptStatus.suspicious
        db.commit()
        return

    try:
        # Load image
        image_data = _load_image(receipt)
        if not image_data:
            analysis.error = "Não foi possível carregar a imagem do comprovante."
            analysis.confidence_score = 0.0
            analysis.is_authentic = False
            analysis.fraud_indicators = ["Imagem não disponível para análise"]
            analysis.ai_summary = "Análise falhou: imagem indisponível."
            receipt.status = ReceiptStatus.suspicious
            db.commit()
            return

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": ANALYSIS_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{image_data['mime']};base64,{image_data['b64']}",
                                "detail": "high",
                            },
                        },
                    ],
                }
            ],
            max_tokens=1000,
            temperature=0,
        )

        raw = response.choices[0].message.content.strip()
        # Strip possible markdown code fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)

        analysis.is_authentic = result.get("is_authentic", False)
        analysis.confidence_score = float(result.get("confidence_score", 0.0))
        analysis.bank_name = result.get("bank_name")
        analysis.amount = result.get("amount")
        analysis.transaction_date = result.get("transaction_date")
        analysis.transaction_id = result.get("transaction_id")
        analysis.sender_name = result.get("sender_name")
        analysis.recipient_name = result.get("recipient_name")
        analysis.fraud_indicators = result.get("fraud_indicators", [])
        analysis.ai_summary = result.get("summary", "")
        analysis.analyzed_at = datetime.utcnow()
        analysis.error = None

        # Auto-approve or flag
        threshold = settings.auto_approve_threshold
        if analysis.confidence_score >= threshold and analysis.is_authentic:
            receipt.status = ReceiptStatus.approved
            receipt.auto_processed = True
            logger.info(f"Receipt {receipt_id} auto-approved (score={analysis.confidence_score:.2f})")
        else:
            receipt.status = ReceiptStatus.suspicious
            logger.info(f"Receipt {receipt_id} flagged for review (score={analysis.confidence_score:.2f})")

        db.commit()

        # Update client score if auto-approved
        if receipt.status == ReceiptStatus.approved:
            from app.services.score_calculator import on_receipt_approved
            on_receipt_approved(receipt_id, db)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI response: {e}")
        analysis.error = f"Erro ao interpretar resposta da IA: {e}"
        receipt.status = ReceiptStatus.suspicious
        db.commit()
    except Exception as e:
        logger.error(f"Analysis failed for receipt {receipt_id}: {e}")
        analysis.error = str(e)
        receipt.status = ReceiptStatus.suspicious
        db.commit()


def _load_image(receipt: Receipt) -> dict | None:
    """Load image from local path or URL, return base64 encoded data."""
    # Try local file first
    if receipt.image_path and Path(receipt.image_path).exists():
        path = Path(receipt.image_path)
        mime = _mime_from_extension(path.suffix)
        data = path.read_bytes()
        return {"b64": base64.b64encode(data).decode(), "mime": mime}

    # Try downloading from URL
    if receipt.image_url:
        import httpx
        try:
            resp = httpx.get(receipt.image_url, timeout=20, follow_redirects=True)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "image/jpeg")
            mime = content_type.split(";")[0].strip()
            return {"b64": base64.b64encode(resp.content).decode(), "mime": mime}
        except Exception as e:
            logger.error(f"Failed to download image from {receipt.image_url}: {e}")

    return None


def _mime_from_extension(ext: str) -> str:
    mapping = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    return mapping.get(ext.lower(), "image/jpeg")
