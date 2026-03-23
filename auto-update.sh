#!/usr/bin/env bash
# DarkCred ZAP Analyst — Auto-update service
# Verifica se há novos commits e faz rebuild automaticamente
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="/var/log/darkcred-update.log"
BRANCH="${UPDATE_BRANCH:-main}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

cd "$PROJECT_DIR"

# Verificar se é um repositório git
if ! git rev-parse --git-dir &>/dev/null; then
  log "ERRO: Não é um repositório git em $PROJECT_DIR"
  exit 0
fi

# Buscar atualizações do remoto
log "Verificando atualizações (branch: $BRANCH)..."
git fetch origin "$BRANCH" 2>>"$LOG_FILE" || {
  log "AVISO: git fetch falhou — sem conexão?"
  exit 0
}

LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null)

if [[ "$LOCAL" == "$REMOTE" ]]; then
  log "Sem atualizações. (commit: ${LOCAL:0:8})"
  exit 0
fi

log "Nova versão disponível! Local=${LOCAL:0:8} → Remoto=${REMOTE:0:8}"
log "Aplicando atualização..."

# Pull do código
git pull origin "$BRANCH" 2>>"$LOG_FILE" || {
  log "ERRO: git pull falhou"
  exit 1
}

# Detectar docker compose
if docker compose version &>/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

# Rebuild e restart
log "Reconstruindo containers..."
$DC -f "$PROJECT_DIR/docker-compose.yml" up -d --build 2>>"$LOG_FILE" && \
  log "Atualização concluída com sucesso! (commit: ${REMOTE:0:8})" || \
  log "ERRO: Falha no rebuild dos containers"
