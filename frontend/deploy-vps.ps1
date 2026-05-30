# ================================================================
# DEPLOY - Condominio Itauna >>> VPS (www.itauna.org)
# Uso: .\deploy-vps.ps1
# Pre-requisito: chave SSH configurada para o VPS
# ================================================================

$VPS_HOST = "191.101.71.74"
$VPS_USER = "root"
$VPS_PATH = "/var/www/itauna"
$DIST_DIR = "dist"

Write-Host ""
Write-Host "=== DEPLOY ITAUNA >>> VPS (www.itauna.org) ===" -ForegroundColor Cyan
Write-Host ""

# [1/4] Verificar dependencias
Write-Host "[1/4] Verificando dependencias..." -ForegroundColor Yellow

$sshAvail = Get-Command ssh -ErrorAction SilentlyContinue
$scpAvail = Get-Command scp -ErrorAction SilentlyContinue

if (-not $sshAvail -or -not $scpAvail) {
    Write-Host "ERRO: ssh/scp nao encontrados. Instale OpenSSH ou Git Bash." -ForegroundColor Red
    exit 1
}
Write-Host "OK: ssh/scp disponiveis" -ForegroundColor Green

# [2/4] Build para producao
Write-Host ""
Write-Host "[2/4] Build para producao..." -ForegroundColor Yellow

# Garantir que o dist anterior nao esta travado
if (Test-Path $DIST_DIR) {
    Remove-Item -Recurse -Force $DIST_DIR -ErrorAction SilentlyContinue
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Build falhou!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Build concluido em ./$DIST_DIR" -ForegroundColor Green

# [3/4] Preparar diretorio remoto
Write-Host ""
Write-Host "[3/4] Preparando diretorio remoto no VPS..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p $VPS_PATH && rm -rf ${VPS_PATH}/*"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao preparar diretorio remoto!" -ForegroundColor Red
    Write-Host "Verifique: ssh ${VPS_USER}@${VPS_HOST}" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: Diretorio remoto limpo" -ForegroundColor Green

# [4/4] Enviar arquivos via SCP
Write-Host ""
Write-Host "[4/4] Enviando arquivos para o VPS..." -ForegroundColor Yellow
scp -r "${DIST_DIR}/*" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: SCP falhou!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Arquivos enviados" -ForegroundColor Green

# Resultado
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCESSO! APLICACAO ONLINE EM:" -ForegroundColor Green
Write-Host "  https://www.itauna.org" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "Timestamp: $timestamp" -ForegroundColor Gray
Write-Host "Framework: Vite + React + TypeScript" -ForegroundColor Gray
Write-Host "Backend  : Supabase" -ForegroundColor Gray
Write-Host "VPS      : $VPS_HOST ($VPS_PATH)" -ForegroundColor Gray
Write-Host ""
