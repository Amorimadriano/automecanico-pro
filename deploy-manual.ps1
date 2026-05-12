# Deploy Manual para Hostinger via FTP
# Execute este script no PowerShell apos o build

$ErrorActionPreference = "Stop"

Write-Host "=== Deploy Manual para Hostinger ===" -ForegroundColor Cyan

# Configuracoes
$ftpServer = "ftp://mecanicopro.9ninebusinesscontrol.com.br"
$ftpUser = "u883849716.mecanicopro"
$ftpPass = "Enzo@159753"
$localPath = "./dist/client"
$remotePath = "public_html"

# Verificar se dist/client existe
if (-not (Test-Path $localPath)) {
    Write-Error "Diretorio $localPath nao encontrado. Execute 'npm run build' primeiro."
    exit 1
}

# Verificar se index.html existe
if (-not (Test-Path "$localPath/index.html")) {
    Write-Error "index.html nao encontrado em $localPath."
    Write-Host "Iniciando servidor local para gerar index.html..."
    $env:PORT = "3003"
    Start-Process node -ArgumentList "server.js" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    Invoke-WebRequest -Uri "http://localhost:3003/" -OutFile "$localPath/index.html"
    Write-Host "index.html gerado."
}

Write-Host "Arquivos encontrados em ${localPath}:"
Get-ChildItem $localPath | Format-Table Name, Length

Write-Host ""
Write-Host "IMPORTANTE: Para fazer upload via FTP, use o FileZilla ou WinSCP:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Servidor: $ftpServer"
Write-Host "  Usuario:  $ftpUser"
Write-Host "  Senha:    $ftpPass"
Write-Host "  Path:     $remotePath"
Write-Host ""
Write-Host "Faca upload de TODO o conteudo de 'dist/client/' para a pasta '$remotePath/'" -ForegroundColor Green
Write-Host ""
Write-Host "Arquivos obrigatorios:" -ForegroundColor Cyan
Write-Host "  - index.html"
Write-Host "  - .htaccess"
Write-Host "  - assets/ (pasta inteira)"
Write-Host "  - manifest.json"
Write-Host "  - sw.js"
Write-Host "  - registerSW.js"
Write-Host "  - icon-*.svg"
Write-Host ""
Write-Host "=== Se o 403 persistir, tente: ==="
Write-Host "1. Renomear .htaccess para .htaccess.bak (testa sem rewrite)"
Write-Host "2. Verificar se index.html tem permissao 644"
Write-Host "3. Verificar no painel Hostinger se o dominio aponta para public_html/"
