# Script de Deploy para Cloudflare Workers / Assets (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "=== Deploy AutoMecanico Pro -> Cloudflare ===" -ForegroundColor Cyan

# Garantir uso do Node v20+ via NVM se disponível
if (Test-Path "C:\nvm4w\nodejs") {
    $env:PATH = "C:\nvm4w\nodejs;C:\Users\adriano.santos\AppData\Roaming\npm;" + $env:PATH
}

# 1. Executar build
Write-Host "1. Executando build da aplicação..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha no build da aplicação."
    exit $LASTEXITCODE
}

# 2. Executar deploy via Wrangler
Write-Host "2. Publicando na Cloudflare via Wrangler..." -ForegroundColor Yellow
npx wrangler deploy

if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha no deploy para o Cloudflare."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "=== Deploy para Cloudflare concluído com sucesso! ===" -ForegroundColor Green
