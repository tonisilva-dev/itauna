# ================================================================
# DEPLOY - Pipeline Rateios >>> VPS (backend automation)
# Uso: .\backend\deploy-rateios-vps.ps1
# Pre-requisito: chave SSH configurada para o VPS
# ================================================================

$VPS_HOST = "191.101.71.74"
$VPS_USER = "root"
$BACKEND_PATH = "/var/www/itauna-backend"
$SCRIPTS_PATH = "$BACKEND_PATH/scripts"

Write-Host ""
Write-Host "=== DEPLOY RATEIOS >>> VPS Backend ===" -ForegroundColor Cyan
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

# [2/4] Verificar arquivos locais
Write-Host ""
Write-Host "[2/4] Verificando arquivos locais..." -ForegroundColor Yellow

$filesRequired = @(
    "backend\scripts\package.json",
    "backend\scripts\sync-rateios.js",
    "backend\scripts\parsers\rateio-parser.js",
    "backend\scripts\.env.example"
)

foreach ($file in $filesRequired) {
    if (-not (Test-Path $file)) {
        Write-Host "ERRO: Arquivo nao encontrado: $file" -ForegroundColor Red
        exit 1
    }
}
Write-Host "OK: Todos os arquivos presentes" -ForegroundColor Green

# [3/4] Preparar diretorio remoto
Write-Host ""
Write-Host "[3/4] Preparando diretorio remoto no VPS..." -ForegroundColor Yellow

ssh "${VPS_USER}@${VPS_HOST}" @"
    mkdir -p $SCRIPTS_PATH
    cd $SCRIPTS_PATH

    # Backup .env se existir
    if [ -f .env ]; then
        cp .env .env.backup.`date +%s`
    fi
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao preparar diretorio remoto!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Diretorio remoto preparado" -ForegroundColor Green

# [4/4] Enviar arquivos via SCP
Write-Host ""
Write-Host "[4/4] Enviando arquivos para VPS..." -ForegroundColor Yellow

scp -r "backend\scripts\*" "${VPS_USER}@${VPS_HOST}:${SCRIPTS_PATH}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: SCP falhou!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Arquivos enviados" -ForegroundColor Green

# [5/5] Instalar dependencies e configurar cron
Write-Host ""
Write-Host "[5/5] Instalando dependencias e configurando cron..." -ForegroundColor Yellow

ssh "${VPS_USER}@${VPS_HOST}" @"
    cd $SCRIPTS_PATH

    # Instalar npm dependencies
    npm install --production

    # Verificar se .env existe (se nao, copiar de .env.example)
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "AVISO: .env criado de .env.example - configure as variaveis!"
    fi

    # Criar cron job se nao existir
    CRON_CMD="0 3 * * * cd $SCRIPTS_PATH && /usr/bin/node sync-rateios.js >> sync-rateios.log 2>&1"

    (crontab -l 2>/dev/null | grep -v "sync-rateios.js"; echo "$CRON_CMD") | crontab -

    echo "Cron job configurado: Diario as 03:00 UTC"
    crontab -l | grep sync-rateios.js
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: Verifique a configuracao manualmente" -ForegroundColor Yellow
}

# Resultado
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCESSO! BACKEND DEPLOYADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximo passo:" -ForegroundColor Cyan
Write-Host "  1. SSH na VPS: ssh ${VPS_USER}@${VPS_HOST}" -ForegroundColor Gray
Write-Host "  2. Editar .env: nano $SCRIPTS_PATH/.env" -ForegroundColor Gray
Write-Host "  3. Testar sync: cd $SCRIPTS_PATH && npm run sync" -ForegroundColor Gray
Write-Host ""
Write-Host "Cron job:" -ForegroundColor Cyan
Write-Host "  - Executara diariamente as 03:00 UTC" -ForegroundColor Gray
Write-Host "  - Logs em: $SCRIPTS_PATH/sync-rateios.log" -ForegroundColor Gray
Write-Host ""
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "Timestamp: $timestamp" -ForegroundColor Gray
Write-Host "VPS: $($VPS_HOST):$($SCRIPTS_PATH)" -ForegroundColor Gray
Write-Host ""
