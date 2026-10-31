#!/bin/bash

set -e

echo "================================================"
echo "  WMS Server - Build do Instalador NSIS"
echo "================================================"
echo ""

if ! command -v makensis &> /dev/null; then
    echo "ERRO: NSIS não está instalado."
    echo "Instale com: sudo apt install nsis"
    exit 1
fi

VERSION=$(node -p "require('../package.json').version")

REQUIRED_FILES=(
    "server.js"
    "pm2-launcher.js"
    "nssm.exe"
    "wms-server-icon.ico"
    "LICENSE.txt"
    "wms-server.nsi"
    ".env"
    "node-v24-x64.msi"
    "public/dist/wms-app/browser/index.html"
)

echo "Verificando arquivos necessários..."
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "ERRO: Arquivo não encontrado: $file"
        if [ "$file" == "node-v24-x64.msi" ]; then
            echo "  Baixe em: https://nodejs.org/dist/latest-v24.x/ (arquivo node-v24.x.x-x64.msi)"
            echo "  Renomeie para node-v24-x64.msi nesta pasta."
        fi
        if [ "$file" == "public/dist/wms-app/browser/index.html" ]; then
            echo "  Build do front ausente. Rode 'npm run installer:win' na raiz do backend."
        fi
        exit 1
    fi
    echo "  ✓ $file"
done

echo ""
echo "Compilando instalador..."
makensis -DAPP_VERSION=$VERSION wms-server.nsi

echo ""
echo "================================================"
echo "  Build concluído com sucesso!"
echo "  Arquivo gerado: WMSServer-Setup-$VERSION.exe"
echo "================================================"