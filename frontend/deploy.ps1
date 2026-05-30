# ================================================================
# DEPLOY - Condominio Itauna para Vercel
# Uso: .\deploy.ps1
# ================================================================

Write-Host ""
Write-Host "=== DEPLOY ITAUNA >>> VERCEL (Producao) ===" -ForegroundColor Cyan
Write-Host ""

# Verificar Vercel CLI
Write-Host "[1/3] Verificando Vercel CLI..." -ForegroundColor Yellow
vercel --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Vercel CLI nao encontrado!" -ForegroundColor Red
    Write-Host "Instale com: npm install -g vercel" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: Vercel CLI instalado" -ForegroundColor Green

# Build para producao
Write-Host ""
Write-Host "[2/3] Build para producao..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Build falhou!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Build concluido" -ForegroundColor Green

# Deploy para Vercel
Write-Host ""
Write-Host "[3/3] Enviando para Vercel..." -ForegroundColor Yellow
$deployOutput = vercel deploy --prod 2>&1
$deployStatus = $LASTEXITCODE

if ($deployStatus -ne 0) {
    Write-Host "ERRO: Deploy falhou!" -ForegroundColor Red
    Write-Host ""
    Write-Host $deployOutput
    Write-Host ""
    Write-Host "Dicas:" -ForegroundColor Yellow
    Write-Host "  1. vercel login" -ForegroundColor Gray
    Write-Host "  2. vercel env list" -ForegroundColor Gray
    exit 1
}

Write-Host "OK: Deploy enviado" -ForegroundColor Green

# Resultado
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCESSO! APLICACAO ONLINE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Extrair URL
$urlMatch = $deployOutput | Select-String -Pattern "https://[a-zA-Z0-9\-\.]+\.vercel\.app"
if ($urlMatch) {
    $deployUrl = $urlMatch.Matches[0].Value
    Write-Host "URL: $deployUrl" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Resumo:" -ForegroundColor Yellow
Write-Host "  Framework: Vite + React + TypeScript" -ForegroundColor Gray
Write-Host "  Backend: Supabase" -ForegroundColor Gray
Write-Host "  Deploy: Vercel (CI/CD)" -ForegroundColor Gray
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "  Timestamp: $timestamp" -ForegroundColor Gray
Write-Host ""
Write-Host "Acesse a URL acima!" -ForegroundColor Cyan
Write-Host ""
