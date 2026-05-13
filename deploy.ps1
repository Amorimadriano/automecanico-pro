# Deploy Automatico para Hostinger via FTP (PowerShell)
# Faz upload de dist/client para a raiz do dominio

$ErrorActionPreference = "Stop"

Write-Host "=== Deploy Automatico para Hostinger ===" -ForegroundColor Cyan

# Configuracoes FTP
$ftpServer = "ftp.mecanicopro.9ninebusinesscontrol.com.br"
$ftpUser = "u883849716.mecanicopro"
$ftpPass = "Enzo@159753"
$localPath = "./dist/client"

# Verificar se dist/client existe
if (-not (Test-Path $localPath)) {
    Write-Error "Diretorio $localPath nao encontrado. Execute 'npm run build' primeiro."
    exit 1
}

# Contar arquivos
$fileCount = (Get-ChildItem $localPath -Recurse -File).Count
Write-Host "Arquivos para upload: $fileCount" -ForegroundColor White
Write-Host ""

# Funcao para fazer upload de um arquivo
function Upload-File($localFile, $remotePath) {
    $uri = "ftp://$ftpServer/$remotePath"
    $request = [System.Net.FtpWebRequest]::Create($uri)
    $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $request.UseBinary = $true
    $request.UsePassive = $true
    $request.KeepAlive = $false

    $bytes = [System.IO.File]::ReadAllBytes($localFile)
    $request.ContentLength = $bytes.Length
    $stream = $request.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()

    $response = $request.GetResponse()
    $response.Close()
}

# Funcao para criar diretorio remoto
function Create-RemoteDir($remotePath) {
    try {
        $uri = "ftp://$ftpServer/$remotePath"
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.UsePassive = $true
        $response = $request.GetResponse()
        $response.Close()
    } catch {
        # Diretorio pode ja existir
    }
}

# Funcao recursiva de upload
function Upload-Recursive($localDir, $remoteDir) {
    $items = Get-ChildItem $localDir
    foreach ($item in $items) {
        $remoteItemPath = if ($remoteDir) { "$remoteDir/$($item.Name)" } else { $item.Name }
        if ($item.PSIsContainer) {
            Write-Host "  [DIR]  $remoteItemPath" -ForegroundColor DarkGray
            Create-RemoteDir $remoteItemPath
            Upload-Recursive $item.FullName $remoteItemPath
        } else {
            Write-Host "  [FILE] $remoteItemPath" -ForegroundColor White
            Upload-File $item.FullName $remoteItemPath
        }
    }
}

Write-Host "Iniciando upload... (isso pode levar alguns minutos)" -ForegroundColor Yellow
Upload-Recursive $localPath ""

Write-Host ""
Write-Host "=== Deploy concluido! ===" -ForegroundColor Green
Write-Host "Acesse: https://mecanicopro.9ninebusinesscontrol.com.br" -ForegroundColor Cyan
