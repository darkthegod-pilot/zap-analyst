# DarkCred — ZAP Analyst

Sistema de verificação de comprovantes de pagamento via WhatsApp com análise por IA.

## Funcionalidades

- **Monitoramento automático**: registra clientes quando o admin envia `Comprovante salvo.`
- **Análise por IA**: GPT-4o Vision verifica autenticidade dos comprovantes
- **Auto-aprovação**: comprovantes com confiança ≥ 85% são aprovados automaticamente
- **Painel web**: visualize, aprove ou rejeite comprovantes em tempo real
- **Relatório diário**: enviado automaticamente às 00:00 BRT no WhatsApp do admin
- **Relatório sob demanda**: peça por texto em linguagem natural

## Stack

- Backend: Python 3.11 + FastAPI + SQLAlchemy + APScheduler
- Frontend: React 18 + Tailwind CSS + Vite
- IA: OpenAI GPT-4o Vision
- WhatsApp: ZAPI (z-api.io)
- Deploy: Docker + docker-compose

## Configuração

### 1. Copiar e preencher variáveis de ambiente

```bash
cp .env.example .env
nano .env   # preencha ZAPI_INSTANCE_ID, ZAPI_TOKEN, OPENAI_API_KEY
```

### 2. Subir os serviços

```bash
docker-compose up -d --build
```

### 3. Configurar webhook no ZAPI

No painel do ZAPI, configure o webhook para:
```
https://SEU_IP_OU_DOMINIO/webhook/zapi
```

### 4. Acessar o painel

```
http://SEU_IP_OU_DOMINIO
```

## Como funciona

1. **Registrar cliente**: envie `Comprovante salvo.` para o número do cliente via WhatsApp (na instância ZAPI configurada)
2. **Receber comprovante**: quando o cliente enviar uma imagem, ela é capturada automaticamente
3. **Análise IA**: GPT-4o analisa o comprovante e retorna score de confiança + indicadores de fraude
4. **Resultado**: aprovação automática (≥85%) ou sinalização para revisão manual no painel

## Endpoints da API

```
POST /webhook/zapi          # Webhook ZAPI (configurar no painel ZAPI)
GET  /api/receipts          # Listar comprovantes
GET  /api/receipts/stats    # Estatísticas
PATCH /api/receipts/{id}/approve
PATCH /api/receipts/{id}/reject
GET  /api/clients           # Clientes monitorados
POST /api/reports/request   # Relatório por linguagem natural
POST /api/reports/send-now  # Enviar relatório agora no WhatsApp
GET  /health                # Health check
```

## Deploy no Hostinger VPS KVM4

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Clonar e configurar
git clone <repo> /opt/zap-analyst
cd /opt/zap-analyst
cp .env.example .env && nano .env

# Subir
docker-compose up -d --build

# Ver logs
docker-compose logs -f backend
```
