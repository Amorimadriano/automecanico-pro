#!/bin/bash
set -e

echo "=== Build para FTP (Hostinger) ==="

# 1. Build de producao
echo "[1/4] Executando build..."
npm run build

# 2. Inicia servidor local para SSR
echo "[2/4] Iniciando servidor local para gerar index.html..."
PORT=3001 node server.js &
SERVER_PID=$!
sleep 3

# 3. Gera index.html estatico
echo "[3/4] Gerando index.html..."
curl -s http://localhost:3001/ > dist/client/index.html

# 4. Para servidor
echo "[4/4] Parando servidor..."
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "=== Build concluido ==="
echo "Arquivos prontos em: dist/client/"
echo "Faca o upload de TODO o conteudo de dist/client/ via FTP para a raiz do seu dominio."
echo ""
echo "Arquivos importantes:"
echo "  - index.html     (pagina principal)"
echo "  - .htaccess      (rewrite rules para SPA)"
echo "  - manifest.json  (PWA)"
echo "  - sw.js          (service worker)"
echo "  - assets/        (JS, CSS, fonts)"
echo "  - icon-*.svg     (icones PWA)"
