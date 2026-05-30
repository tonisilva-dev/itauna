# ================================================================
# DEPLOY GIT — Condomínio Itaúna → GitHub (repositório próprio)
# Uso: .\deploy-git.ps1 [-Message "mensagem de commit"]
# Pré-requisito: repositório github.com/tonisilva-dev/itauna criado
#                e remote 'itauna' configurado neste repo local.
# ================================================================

param(
  [string]$Message = ""
)

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=== COMMIT & PUSH — Itaúna Digital → GitHub ===" -ForegroundColor Cyan
Write-Host ""

# ── [1] Verificar remote dedicado 'itauna' ──────────────────────
Write-Host "[1/5] Verificando remote 'itauna'..." -ForegroundColor Yellow
$remotes = git remote 2>$null
if ($remotes -notcontains "itauna") {
    Write-Host ""
    Write-Host "AVISO: Remote 'itauna' não encontrado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Passos para configurar:" -ForegroundColor Yellow
    Write-Host "  1. Crie o repositório em: https://github.com/new" -ForegroundColor Gray
    Write-Host "     Nome sugerido: itauna" -ForegroundColor Gray
    Write-Host "     Visibilidade: Privado" -ForegroundColor Gray
    Write-Host "  2. Execute:" -ForegroundColor Gray
    Write-Host "     git remote add itauna https://github.com/tonisilva-dev/itauna.git" -ForegroundColor White
    Write-Host "  3. Execute este script novamente." -ForegroundColor Gray
    Write-Host ""
    exit 1
}
$remoteUrl = git remote get-url itauna
Write-Host "OK: Remote 'itauna' → $remoteUrl" -ForegroundColor Green

# ── [2] Status das mudanças ─────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Verificando alterações..." -ForegroundColor Yellow
$status = git status --short
if (-not $status) {
    Write-Host "Nada para commitar — repositório limpo." -ForegroundColor Yellow
    exit 0
}
Write-Host "Arquivos modificados:" -ForegroundColor Gray
$status | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

# ── [3] Mensagem de commit ──────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Preparando commit..." -ForegroundColor Yellow
if (-not $Message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $Message   = "chore: auditoria e correcoes — $timestamp"
}
Write-Host "Mensagem: $Message" -ForegroundColor Gray

# ── [4] Stage + Commit ──────────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Commitando..." -ForegroundColor Yellow

git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao adicionar arquivos." -ForegroundColor Red
    exit 1
}

git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao criar commit." -ForegroundColor Red
    exit 1
}
Write-Host "OK: Commit criado." -ForegroundColor Green

# ── [5] Push para o remote 'itauna' ────────────────────────────
Write-Host ""
Write-Host "[5/5] Enviando para GitHub (remote: itauna)..." -ForegroundColor Yellow

$branch = git branch --show-current
git push itauna $branch
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Push falhou." -ForegroundColor Red
    Write-Host "Dicas:" -ForegroundColor Yellow
    Write-Host "  - Primeiro push: git push -u itauna $branch" -ForegroundColor Gray
    Write-Host "  - Verificar autenticação: gh auth status" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCESSO! Código versionado no GitHub." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Branch : $branch" -ForegroundColor Gray
Write-Host "Remote : $remoteUrl" -ForegroundColor Gray
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "Data   : $timestamp" -ForegroundColor Gray
Write-Host ""
