<div align="center">

<img src="frontend/public/favicon.svg" width="72" height="72" alt="DarkCred Logo" />

# DarkCred — ZAP Analyst

**Sistema inteligente de verificação de comprovantes bancários via WhatsApp**

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white&style=flat-square)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white&style=flat-square)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai&logoColor=white&style=flat-square)](https://openai.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white&style=flat-square)](https://docker.com)
[![License](https://img.shields.io/badge/Licença-MIT-22c55e?style=flat-square)](LICENSE)

*Receba comprovantes pelo WhatsApp → Analise com IA → Aprove ou rejeite no painel*

</div>

---

## 📋 Índice

- [Sobre o Sistema](#-sobre-o-sistema)
- [Funcionalidades](#-funcionalidades)
- [Como Funciona](#-como-funciona)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação Rápida](#-instalação-rápida)
- [Configuração de Variáveis](#-configuração-de-variáveis)
- [Configurar Webhook ZAPI](#-configurar-webhook-zapi)
- [Painel Web](#-painel-web)
- [Relatórios WhatsApp](#-relatórios-whatsapp)
- [API Reference](#-api-reference)
- [Deploy no VPS Hostinger](#-deploy-no-vps-hostinger)
- [Tecnologias](#-tecnologias)

---

## 🎯 Sobre o Sistema

O **DarkCred ZAP Analyst** é um sistema completo para escritórios de empréstimo monitorarem comprovantes de pagamento recebidos via WhatsApp. Clientes registrados enviam fotos de comprovantes, que são automaticamente analisados por IA (GPT-4o Vision) para detectar fraudes e autenticar os documentos.

> **Resumo em uma frase:** Cliente envia comprovante no WhatsApp → IA analisa em segundos → resultado aparece no seu painel com aprovação automática ou alerta de suspeita.

---

## ✨ Funcionalidades

### 🤖 Análise por IA (GPT-4o Vision)
- Extrai automaticamente: banco, valor, data, ID da transação, pagador e beneficiário
- Detecta sinais de fraude: imagens editadas, fontes inconsistentes, IDs inválidos
- Retorna score de confiança de 0 a 100%
- **Aprovação automática** para comprovantes com score ≥ 85%
- **Sinalização para revisão** quando score < 85% ou dados suspeitos

### 📱 Integração WhatsApp (ZAPI)
- Registra clientes ao enviar `Comprovante salvo.` para o número deles
- Monitora automaticamente mensagens dos clientes cadastrados
- Recebe imagens de comprovantes em tempo real via webhook

### 🖥️ Painel Web — Mobile First
- Design responsivo otimizado para celular
- Dashboard com estatísticas em tempo real (atualiza a cada 6s)
- **Filtro de data** em todas as abas (padrão: hoje)
- **Paginação** automática com 20 itens por página
- Aprovação/rejeição manual com um toque
- Histórico completo por cliente e por período

### 📊 Relatórios WhatsApp
- Relatório diário automático às **00:00 (BRT)** para o número do admin
- Pedido de relatório por **linguagem natural** no painel ("relatório de ontem no zap")
- Inclui: totais por status, clientes pendentes, resumo do período

---

## 🔄 Como Funciona

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUXO COMPLETO                           │
└─────────────────────────────────────────────────────────────────┘

  Admin               ZAPI              Backend              Painel
   │                   │                   │                   │
   │─── "Comprovante salvo." ──────────────▶│                   │
   │                   │  webhook POST      │                   │
   │                   │───────────────────▶│ Registra cliente  │
   │                   │                   │                   │
   │                   │                   │                   │
 Cliente               │                   │                   │
   │─── [imagem do comprovante] ──────────▶│                   │
   │                   │  webhook POST      │ Salva imagem      │
   │                   │───────────────────▶│ → GPT-4o Vision   │
   │                   │                   │ → score confiança  │
   │                   │                   │                   │
   │                   │              score ≥ 85%?             │
   │                   │                   │─── Aprovado ──────▶│
   │                   │                   │─── Suspeito ──────▶│ (revisão manual)
   │                   │                   │                   │
  00:00 BRT            │                   │                   │
   │◀─── Relatório diário ────────────────▶│                   │
```

---

## ⚙️ Pré-requisitos

| Requisito | Versão mínima | Link |
|-----------|---------------|------|
| Docker    | 24+           | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Docker Compose | 2.20+  | Incluído no Docker Desktop |
| Conta ZAPI | —            | [app.z-api.io](https://app.z-api.io) |
| Chave OpenAI | —         | [platform.openai.com](https://platform.openai.com/api-keys) |
| VPS Linux (deploy) | — | Hostinger KVM4 ou similar |

---

## 🚀 Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/darkthegod-pilot/zap-analyst.git
cd zap-analyst

# 2. Configure as variáveis de ambiente
cp .env.example .env
nano .env   # preencha as credenciais (ver seção abaixo)

# 3. Suba os serviços
docker-compose up -d --build

# 4. Acesse o painel
open http://localhost
```

> **Pronto!** O painel estará em `http://localhost` e a API em `http://localhost/api`.

---

## 🔑 Configuração de Variáveis

Edite o arquivo `.env` com suas credenciais:

| Variável | Obrigatória | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `ZAPI_INSTANCE_ID` | ✅ | ID da instância ZAPI | `3A5B7C9D1E` |
| `ZAPI_TOKEN` | ✅ | Token da instância ZAPI | `F7K2M4P8Q1` |
| `ZAPI_SECURITY_TOKEN` | ✅ | Token de segurança ZAPI | `xxxxxxxxxxx` |
| `OPENAI_API_KEY` | ✅ | Chave da API OpenAI | `sk-proj-...` |
| `OPENAI_MODEL` | — | Modelo OpenAI (padrão: gpt-4o) | `gpt-4o` |
| `ADMIN_PHONE` | ✅ | Número para relatórios (com DDI) | `5511996554604` |
| `AUTO_APPROVE_THRESHOLD` | — | Limiar de aprovação automática (0–1) | `0.85` |
| `SECRET_KEY` | ✅ | Chave secreta da aplicação | `sua-chave-segura-aqui` |
| `DATABASE_URL` | — | URL do banco SQLite | `sqlite:///./data/darkcred.db` |
| `BASE_URL` | — | URL base do servidor | `https://seu-dominio.com` |

---

## 📡 Configurar Webhook ZAPI

Após subir os serviços, configure o webhook no painel do ZAPI:

1. Acesse [app.z-api.io](https://app.z-api.io) → sua instância → **Webhooks**
2. Ative o webhook de **mensagens recebidas** e **mensagens enviadas**
3. Configure a URL:

```
https://SEU_IP_OU_DOMINIO/webhook/zapi
```

4. Teste o webhook: envie uma mensagem de texto na instância e verifique os logs:

```bash
docker-compose logs -f backend
```

### Como registrar um cliente

No WhatsApp, usando a instância ZAPI configurada, **envie a mensagem exata abaixo** para o número do cliente:

```
Comprovante salvo.
```

*(com ponto final, exatamente assim)*

O sistema detectará essa mensagem e registrará o cliente como monitorado automaticamente.

---

## 🖥️ Painel Web

### Aba — Comprovantes
- Lista todos os comprovantes recebidos
- **Filtro de data**: Hoje / Ontem / 7 dias / 30 dias / Tudo / Período personalizado
- **Filtro de status**: Todos / Pendentes / Suspeitos / Aprovados / Rejeitados
- Clique em qualquer card para expandir detalhes completos
- Aprovação/rejeição manual para itens suspeitos ou pendentes

### Aba — Clientes
- Lista todos os clientes monitorados
- Filtro por data de registro
- Edição de nome inline
- Desativação de monitoramento por cliente
- Contador de comprovantes por cliente

### Aba — Relatórios
- Botão de envio imediato do relatório para o WhatsApp
- Seletor de período integrado
- Chat em linguagem natural: "relatório de ontem no zap", "quantos aprovados hoje?"
- Copiar relatório para área de transferência

---

## 📊 Relatórios WhatsApp

O sistema envia automaticamente o seguinte resumo todo dia à meia-noite (BRT):

```
📊 Relatório DarkCred — 23/03/2026

✅ Aprovados: 12
❌ Rejeitados: 2
⚠️ Suspeitos/Revisão: 3
⏳ Pendentes: 1
📬 Total recebido: 18

🔍 Aguardando revisão manual:
• João Silva — 5511988887777
• Maria Santos — 5521977776666

👥 Clientes monitorados: 24/30

_DarkCred ZAP Analyst_
```

---

## 📚 API Reference

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/webhook/zapi` | Recebe eventos do ZAPI |
| `GET`  | `/api/receipts` | Lista comprovantes (paginado) |
| `GET`  | `/api/receipts/stats` | Estatísticas por período |
| `GET`  | `/api/receipts/{id}` | Detalhe do comprovante |
| `PATCH`| `/api/receipts/{id}/approve` | Aprovar manualmente |
| `PATCH`| `/api/receipts/{id}/reject` | Rejeitar manualmente |
| `GET`  | `/api/clients` | Lista clientes (paginado) |
| `PATCH`| `/api/clients/{id}/name` | Atualizar nome do cliente |
| `PATCH`| `/api/clients/{id}/deactivate` | Desativar monitoramento |
| `POST` | `/api/reports/request` | Gerar relatório por linguagem natural |
| `POST` | `/api/reports/send-now` | Enviar relatório agora no WhatsApp |
| `GET`  | `/health` | Health check |

### Parâmetros de filtro (GET `/api/receipts` e `/api/clients`)

| Parâmetro  | Tipo     | Descrição                     | Exemplo       |
|------------|----------|-------------------------------|---------------|
| `date_from`| `string` | Data inicial (ISO 8601)       | `2026-03-01`  |
| `date_to`  | `string` | Data final (ISO 8601)         | `2026-03-23`  |
| `status`   | `string` | Filtro de status (só receipts)| `suspicious`  |
| `limit`    | `int`    | Itens por página (padrão: 20) | `20`          |
| `offset`   | `int`    | Deslocamento para paginação   | `40`          |

---

## 🖥️ Deploy no VPS Hostinger

```bash
# 1. Conecte ao VPS via SSH
ssh root@SEU_IP

# 2. Instale o Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# 3. Clone e configure
git clone https://github.com/darkthegod-pilot/zap-analyst.git /opt/zap-analyst
cd /opt/zap-analyst
cp .env.example .env
nano .env   # preencher todas as variáveis obrigatórias

# 4. Suba os serviços
docker-compose up -d --build

# 5. Verifique os logs
docker-compose logs -f backend

# 6. Configure SSL (recomendado)
apt install -y certbot python3-certbot-nginx
certbot --nginx -d seu-dominio.com
```

### Atualizar para nova versão

```bash
cd /opt/zap-analyst
git pull origin main
docker-compose up -d --build
```

### Comandos úteis

```bash
# Ver logs em tempo real
docker-compose logs -f

# Reiniciar apenas o backend
docker-compose restart backend

# Backup do banco de dados
cp data/darkcred.db backups/darkcred-$(date +%Y%m%d).db

# Parar todos os serviços
docker-compose down
```

---

## 🛠️ Tecnologias

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Backend | Python + FastAPI | 3.11 / 0.115 |
| Banco de dados | SQLite + SQLAlchemy | — / 2.0 |
| Agendador | APScheduler | 3.10 |
| IA | OpenAI GPT-4o Vision | — |
| WhatsApp | ZAPI (z-api.io) | — |
| Frontend | React + Vite | 18 / 5.4 |
| Estilização | Tailwind CSS | 3.4 |
| Ícones | Lucide React | 0.453 |
| Notificações | React Hot Toast | 2.4 |
| Containerização | Docker + Compose | — |
| Proxy | Nginx | alpine |

---

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

---

<div align="center">
  <sub>Desenvolvido para o escritório de empréstimos <strong>DarkCred</strong></sub>
</div>
