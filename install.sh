#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║         DarkCred ZAP Analyst — Instalador VPS               ║
# ║         Ubuntu 20.04+ / Debian 11+                          ║
# ╚══════════════════════════════════════════════════════════════╝
set -euo pipefail

# ─── Cores ────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "${GREEN}  ✔  $*${RESET}"; }
info() { echo -e "${CYAN}  ➜  $*${RESET}"; }
warn() { echo -e "${YELLOW}  ⚠  $*${RESET}"; }
err()  { echo -e "${RED}  ✖  $*${RESET}" >&2; }
die()  { err "$*"; exit 1; }

step() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━  $*  ━━━${RESET}"
}

# ─── Banner ───────────────────────────────────────────────────
clear
echo -e "${CYAN}"
cat << 'BANNER'
  ██████╗  █████╗ ██████╗ ██╗  ██╗ ██████╗██████╗ ███████╗██████╗
  ██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝██╔════╝██╔══██╗██╔════╝██╔══██╗
  ██║  ██║███████║██████╔╝█████╔╝ ██║     ██████╔╝█████╗  ██║  ██║
  ██║  ██║██╔══██║██╔══██╗██╔═██╗ ██║     ██╔══██╗██╔══╝  ██║  ██║
  ██████╔╝██║  ██║██║  ██║██║  ██╗╚██████╗██║  ██║███████╗██████╔╝
  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═════╝
BANNER
echo -e "${RESET}"
echo -e "${BOLD}  ZAP Analyst — Instalador Automático VPS${RESET}"
echo -e "  Hostinger VPS · Ubuntu 20.04+ / Debian 11+"
echo ""
echo -e "  ${YELLOW}Este script vai instalar e configurar o sistema completo.${RESET}"
echo ""
read -rp "  Pressione ENTER para continuar ou Ctrl+C para cancelar..." _

# ─── 1. Verificar root ────────────────────────────────────────
step "Verificando permissões"
if [[ $EUID -ne 0 ]]; then
  die "Execute como root: sudo bash install.sh"
fi
ok "Executando como root"

# ─── 2. Verificar OS ──────────────────────────────────────────
step "Verificando sistema operacional"
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  OS_ID="${ID:-unknown}"
  OS_VERSION="${VERSION_ID:-0}"
else
  die "Não foi possível detectar o sistema operacional."
fi

case "$OS_ID" in
  ubuntu)
    VER_MAJOR=$(echo "$OS_VERSION" | cut -d. -f1)
    [[ $VER_MAJOR -ge 20 ]] || die "Ubuntu 20.04+ obrigatório (detectado: $OS_VERSION)"
    ok "Ubuntu $OS_VERSION detectado"
    PKG_UPDATE="apt-get update -qq"
    PKG_INSTALL="apt-get install -y -qq"
    ;;
  debian)
    VER_MAJOR=$(echo "$OS_VERSION" | cut -d. -f1)
    [[ $VER_MAJOR -ge 11 ]] || die "Debian 11+ obrigatório (detectado: $OS_VERSION)"
    ok "Debian $OS_VERSION detectado"
    PKG_UPDATE="apt-get update -qq"
    PKG_INSTALL="apt-get install -y -qq"
    ;;
  *)
    die "OS não suportado: $OS_ID. Use Ubuntu 20.04+ ou Debian 11+."
    ;;
esac

# ─── 3. Instalar dependências do sistema ─────────────────────
step "Verificando e instalando dependências"

info "Atualizando lista de pacotes..."
$PKG_UPDATE || die "Falha ao atualizar apt"

install_if_missing() {
  local pkg="$1"
  local bin="${2:-$1}"
  if command -v "$bin" &>/dev/null; then
    ok "$pkg já instalado ($(command -v "$bin"))"
  else
    info "Instalando $pkg..."
    $PKG_INSTALL "$pkg" || die "Falha ao instalar $pkg"
    ok "$pkg instalado"
  fi
}

install_if_missing curl curl
install_if_missing git git
install_if_missing openssl openssl
install_if_missing ca-certificates update-ca-certificates
install_if_missing gnupg gpg

# Docker
if command -v docker &>/dev/null; then
  DOCKER_VER=$(docker --version 2>/dev/null | grep -oP '\d+\.\d+' | head -1)
  ok "Docker $DOCKER_VER já instalado"
else
  info "Instalando Docker via script oficial..."
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  bash /tmp/get-docker.sh || die "Falha ao instalar Docker"
  rm -f /tmp/get-docker.sh
  systemctl enable --now docker
  ok "Docker instalado"
fi

# Docker Compose (plugin v2)
if docker compose version &>/dev/null 2>&1; then
  DC_VER=$(docker compose version --short 2>/dev/null || echo "v2")
  ok "Docker Compose $DC_VER disponível"
elif command -v docker-compose &>/dev/null; then
  ok "docker-compose (v1) disponível"
  # Criar alias para comando v2-style
  ln -sf "$(command -v docker-compose)" /usr/local/bin/docker-compose
else
  info "Instalando Docker Compose plugin..."
  COMPOSE_VERSION="v2.24.6"
  ARCH=$(uname -m)
  [[ "$ARCH" == "x86_64" ]] && ARCH="x86_64" || ARCH="aarch64"
  COMPOSE_URL="https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${ARCH}"
  curl -fsSL "$COMPOSE_URL" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  ok "Docker Compose $COMPOSE_VERSION instalado"
fi

# ─── 4. Localizar diretório do projeto ───────────────────────
step "Localizando diretório do projeto"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

if [[ ! -f "$PROJECT_DIR/docker-compose.yml" ]]; then
  die "docker-compose.yml não encontrado em $PROJECT_DIR. Execute o script da raiz do projeto."
fi
ok "Projeto encontrado em: $PROJECT_DIR"
cd "$PROJECT_DIR"

# ─── 5. Detectar IP público ──────────────────────────────────
step "Detectando IP público da VPS"
PUBLIC_IP=""
for endpoint in "https://ifconfig.me" "https://api.ipify.org" "https://icanhazip.com"; do
  PUBLIC_IP=$(curl -s --connect-timeout 5 "$endpoint" 2>/dev/null | tr -d '[:space:]') || true
  if [[ "$PUBLIC_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    ok "IP público detectado: $PUBLIC_IP"
    break
  fi
done
if [[ -z "$PUBLIC_IP" ]]; then
  warn "Não foi possível detectar o IP público automaticamente."
  read -rp "  Digite o IP público da sua VPS: " PUBLIC_IP
  [[ -n "$PUBLIC_IP" ]] || die "IP não informado."
fi

# ─── 6. Configurar .env ──────────────────────────────────────
step "Configurando variáveis de ambiente"

if [[ -f "$PROJECT_DIR/.env" ]]; then
  warn "Arquivo .env já existe."
  read -rp "  Deseja reconfigurar? (s/N): " RECONF
  RECONF="${RECONF,,}"
  if [[ "$RECONF" != "s" && "$RECONF" != "sim" ]]; then
    ok "Mantendo .env existente."
    source "$PROJECT_DIR/.env" 2>/dev/null || true
    SKIP_ENV=true
  else
    cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.bak.$(date +%s)"
    ok "Backup do .env salvo."
    SKIP_ENV=false
  fi
else
  SKIP_ENV=false
fi

prompt_required() {
  local var="$1"
  local label="$2"
  local val=""
  while [[ -z "$val" ]]; do
    read -rp "  ${BOLD}${label}${RESET}: " val
    [[ -z "$val" ]] && warn "Campo obrigatório!"
  done
  echo "$val"
}

prompt_default() {
  local var="$1"
  local label="$2"
  local default="$3"
  read -rp "  ${BOLD}${label}${RESET} [${CYAN}${default}${RESET}]: " val
  echo "${val:-$default}"
}

prompt_phone() {
  local val=""
  while true; do
    read -rp "  ${BOLD}Telefone admin WhatsApp (formato: 5511999990000)${RESET}: " val
    val=$(echo "$val" | tr -d ' +-')
    if [[ "$val" =~ ^55[0-9]{10,11}$ ]]; then
      echo "$val"
      return
    fi
    warn "Formato inválido. Use: 55 + DDD + número (ex: 5511999990000)"
  done
}

prompt_pin() {
  local val=""
  while true; do
    read -rsp "  ${BOLD}PIN do dashboard (mín. 4 dígitos)${RESET} [4344]: " val
    echo ""
    val="${val:-4344}"
    if [[ "$val" =~ ^[0-9]{4,}$ ]]; then
      echo "$val"
      return
    fi
    warn "PIN deve conter apenas números (mínimo 4 dígitos)"
  done
}

if [[ "${SKIP_ENV:-false}" == "false" ]]; then
  echo ""
  echo -e "  ${YELLOW}Preencha as configurações abaixo (campos obrigatórios):${RESET}"
  echo ""

  echo -e "  ${BOLD}── ZAPI (WhatsApp) ──────────────────────────────────${RESET}"
  ZAPI_INSTANCE_ID=$(prompt_required ZAPI_INSTANCE_ID "ZAPI Instance ID")
  ZAPI_TOKEN=$(prompt_required ZAPI_TOKEN "ZAPI Token")
  ZAPI_SECURITY_TOKEN=$(prompt_required ZAPI_SECURITY_TOKEN "ZAPI Security Token")

  echo ""
  echo -e "  ${BOLD}── OpenAI ───────────────────────────────────────────${RESET}"
  OPENAI_API_KEY=$(prompt_required OPENAI_API_KEY "OpenAI API Key (sk-...)")

  echo ""
  echo -e "  ${BOLD}── Admin ────────────────────────────────────────────${RESET}"
  ADMIN_PHONE=$(prompt_phone)

  echo ""
  echo -e "  ${BOLD}── Dashboard ────────────────────────────────────────${RESET}"
  DASHBOARD_PIN=$(prompt_pin)
  OPENAI_MODEL=$(prompt_default OPENAI_MODEL "Modelo OpenAI" "gpt-4o")

  # Auto-gerados
  SECRET_KEY=$(openssl rand -hex 32)
  BASE_URL="http://${PUBLIC_IP}"

  cat > "$PROJECT_DIR/.env" << ENVFILE
# DarkCred ZAP Analyst — Configurações
# Gerado em: $(date '+%d/%m/%Y %H:%M:%S')

# ── ZAPI (WhatsApp) ──────────────────────────────────────
ZAPI_INSTANCE_ID=${ZAPI_INSTANCE_ID}
ZAPI_TOKEN=${ZAPI_TOKEN}
ZAPI_SECURITY_TOKEN=${ZAPI_SECURITY_TOKEN}

# ── OpenAI ───────────────────────────────────────────────
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_MODEL=${OPENAI_MODEL}

# ── Admin ────────────────────────────────────────────────
ADMIN_PHONE=${ADMIN_PHONE}

# ── Dashboard ────────────────────────────────────────────
DASHBOARD_PIN=${DASHBOARD_PIN}

# ── App ──────────────────────────────────────────────────
SECRET_KEY=${SECRET_KEY}
BASE_URL=${BASE_URL}
DATABASE_URL=sqlite:///./data/darkcred.db
UPLOAD_DIR=./uploads
AUTO_APPROVE_THRESHOLD=0.85
ENVFILE

  chmod 600 "$PROJECT_DIR/.env"
  ok ".env criado com sucesso"
else
  DASHBOARD_PIN=$(grep -oP '(?<=DASHBOARD_PIN=)\S+' "$PROJECT_DIR/.env" 2>/dev/null || echo "4344")
fi

# ─── 7. Criar diretórios ─────────────────────────────────────
step "Criando diretórios de dados"
mkdir -p "$PROJECT_DIR/data" "$PROJECT_DIR/uploads" "$PROJECT_DIR/ssl"
chmod 755 "$PROJECT_DIR/data" "$PROJECT_DIR/uploads" "$PROJECT_DIR/ssl"
ok "Diretórios criados: data/ uploads/ ssl/"

# ─── 8. Gerar SSL auto-assinado ──────────────────────────────
step "Configurando certificado SSL"
SSL_CERT="$PROJECT_DIR/ssl/fullchain.pem"
SSL_KEY="$PROJECT_DIR/ssl/privkey.pem"

if [[ -f "$SSL_CERT" && -f "$SSL_KEY" ]]; then
  ok "Certificado SSL existente encontrado."
else
  info "Gerando certificado SSL auto-assinado para $PUBLIC_IP..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_KEY" \
    -out "$SSL_CERT" \
    -subj "/CN=${PUBLIC_IP}/O=DarkCred/C=BR" \
    -addext "subjectAltName=IP:${PUBLIC_IP}" \
    2>/dev/null
  chmod 600 "$SSL_KEY"
  ok "Certificado SSL gerado (válido por 365 dias)"
fi

# Verificar se docker-compose.yml usa SSL
if grep -q "443:443" "$PROJECT_DIR/docker-compose.yml" 2>/dev/null; then
  info "Modo HTTPS configurado (porta 443)"
  ACCESS_URL="https://${PUBLIC_IP}"
else
  info "Modo HTTP configurado (porta 80)"
  ACCESS_URL="http://${PUBLIC_IP}"
fi

# ─── 9. Build das imagens Docker ─────────────────────────────
step "Construindo imagens Docker"
info "Isso pode levar alguns minutos na primeira vez..."

dc_cmd() {
  if docker compose version &>/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

cd "$PROJECT_DIR"
dc_cmd build --no-cache 2>&1 | while IFS= read -r line; do
  echo -e "  ${CYAN}│${RESET} $line"
done || die "Falha no build das imagens Docker."
ok "Imagens Docker construídas"

# ─── 10. Subir containers ────────────────────────────────────
step "Iniciando containers"
dc_cmd down --remove-orphans 2>/dev/null || true
dc_cmd up -d || die "Falha ao iniciar containers."
ok "Containers iniciados"

# ─── 11. Health check ────────────────────────────────────────
step "Verificando saúde do sistema"
info "Aguardando o backend ficar disponível..."

HEALTH_URL="http://localhost:8000/health"
MAX_TRIES=40
WAIT=3
HEALTHY=false

for i in $(seq 1 $MAX_TRIES); do
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    HEALTHY=true
    break
  fi
  printf "  Tentativa %d/%d — aguardando %ds...\r" "$i" "$MAX_TRIES" "$WAIT"
  sleep "$WAIT"
done

echo ""
if [[ "$HEALTHY" == "true" ]]; then
  ok "Backend respondendo em $HEALTH_URL"
else
  warn "Backend não respondeu após ${MAX_TRIES} tentativas."
  warn "Verifique os logs: docker compose logs backend"
fi

# Verificar frontend
FRONTEND_HEALTHY=false
for i in $(seq 1 10); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
    FRONTEND_HEALTHY=true
    break
  fi
  sleep 2
done

if [[ "$FRONTEND_HEALTHY" == "true" ]]; then
  ok "Frontend respondendo em http://localhost"
else
  warn "Frontend ainda não disponível. Aguarde alguns segundos e acesse a URL."
fi

# ─── 12. Firewall ────────────────────────────────────────────
step "Configurando firewall"
if command -v ufw &>/dev/null; then
  ufw --force enable >/dev/null 2>&1 || true
  ufw allow ssh >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ok "UFW configurado: SSH, HTTP (80), HTTPS (443) liberados"
else
  warn "UFW não encontrado. Configure o firewall manualmente."
fi

# ─── 13. Status final dos containers ─────────────────────────
step "Status dos containers"
dc_cmd ps 2>/dev/null | while IFS= read -r line; do
  echo "  $line"
done

# ─── 13b. Auto-update systemd timer ─────────────────────────
step "Configurando atualização automática"

AUTOUPDATE_SH="$PROJECT_DIR/auto-update.sh"
chmod +x "$AUTOUPDATE_SH" 2>/dev/null || true

# Detectar branch atual
GIT_BRANCH=$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

cat > /etc/systemd/system/darkcred-update.service << SVCFILE
[Unit]
Description=DarkCred ZAP Analyst — Auto Update
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/bin/bash ${AUTOUPDATE_SH}
Environment=UPDATE_BRANCH=${GIT_BRANCH}
WorkingDirectory=${PROJECT_DIR}
StandardOutput=journal
StandardError=journal
SVCFILE

cat > /etc/systemd/system/darkcred-update.timer << TIMERFILE
[Unit]
Description=DarkCred ZAP Analyst — Auto Update (a cada 5 min)
After=network-online.target

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
TIMERFILE

systemctl daemon-reload
systemctl enable --now darkcred-update.timer 2>/dev/null && \
  ok "Auto-update ativado (verifica a cada 5 min — branch: $GIT_BRANCH)" || \
  warn "Não foi possível ativar o timer systemd (systemd não disponível?)"

# ─── 14. Resumo final ────────────────────────────────────────
echo ""
echo ""
echo -e "${GREEN}${BOLD}"
cat << 'SUCCESS'
  ╔══════════════════════════════════════════════════════╗
  ║         🎉  DarkCred instalado com sucesso!          ║
  ╚══════════════════════════════════════════════════════╝
SUCCESS
echo -e "${RESET}"

echo -e "  ${BOLD}Acesso ao dashboard:${RESET}"
echo -e "  ${CYAN}${BOLD}  → ${ACCESS_URL}${RESET}"
echo ""
echo -e "  ${BOLD}PIN de acesso:${RESET}  ${YELLOW}${BOLD}${DASHBOARD_PIN}${RESET}"
echo ""
echo -e "  ${BOLD}Webhook ZAPI:${RESET}"
echo -e "  ${CYAN}  → ${ACCESS_URL}/webhook/zapi${RESET}"
echo ""
echo -e "  ${BOLD}Próximos passos:${RESET}"
echo -e "  ${YELLOW}  1.${RESET} Acesse o dashboard e configure nas Configurações"
echo -e "  ${YELLOW}  2.${RESET} Configure o webhook no painel da ZAPI com a URL acima"
echo -e "  ${YELLOW}  3.${RESET} Teste enviando uma imagem no WhatsApp monitorado"
echo ""
echo -e "  ${BOLD}Comandos úteis:${RESET}"
echo -e "  ${CYAN}  Logs:        ${RESET}cd ${PROJECT_DIR} && docker compose logs -f"
echo -e "  ${CYAN}  Restart:     ${RESET}cd ${PROJECT_DIR} && docker compose restart"
echo -e "  ${CYAN}  Parar:       ${RESET}cd ${PROJECT_DIR} && docker compose down"
echo -e "  ${CYAN}  Update now:  ${RESET}bash ${PROJECT_DIR}/auto-update.sh"
echo -e "  ${CYAN}  Auto-update: ${RESET}systemctl status darkcred-update.timer"
echo ""
echo -e "  ${BOLD}Arquivo de configuração:${RESET} ${PROJECT_DIR}/.env"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${BOLD}DarkCred ZAP Analyst${RESET} — Instalação concluída em $(date '+%d/%m/%Y %H:%M:%S')"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
