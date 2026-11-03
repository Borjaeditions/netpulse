#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================
# NetPulse - Actualizador
# ==========================================

PROJECT_DIR="$HOME/proyectos/netpulse"
BRANCH="main"

echo "=========================================="
echo "       NETPULSE - ACTUALIZADOR"
echo "=========================================="

cd "$PROJECT_DIR"

# 1. Verificar herramientas
echo "[1/6] Verificando dependencias..."

command -v git >/dev/null || {
    echo "ERROR: Git no está instalado."
    exit 1
}

command -v docker >/dev/null || {
    echo "ERROR: Docker no está instalado."
    exit 1
}

docker compose version >/dev/null || {
    echo "ERROR: Docker Compose no está disponible."
    exit 1
}

# 2. Comprobar cambios locales
echo "[2/6] Comprobando repositorio..."

if [[ -n "$(git status --porcelain)" ]]; then
    echo "ERROR: Existen cambios locales sin confirmar."
    echo "Revisa git status antes de actualizar."
    exit 1
fi

# 3. Obtener cambios de GitHub
echo "[3/6] Consultando GitHub..."

git fetch origin "$BRANCH"

# 4. Cambiar a la rama de despliegue
echo "[4/6] Preparando rama $BRANCH..."

git switch "$BRANCH"

# 5. Actualizar repositorio
echo "[5/6] Actualizando archivos..."

git pull --ff-only origin "$BRANCH"

# 6. Reconstruir y ejecutar contenedores
echo "[6/6] Actualizando Docker..."

docker compose up -d --build --remove-orphans

echo ""
echo "=========================================="
echo "       ACTUALIZACIÓN COMPLETADA"
echo "=========================================="

docker compose ps
