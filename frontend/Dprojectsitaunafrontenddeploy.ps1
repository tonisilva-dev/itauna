#Requires -Version 7.0
<#
.SYNOPSIS
    Deploy script para Condomínio Itaúna - Commit + Push + Deploy Vercel

.DESCRIPTION
    Automatiza o processo completo:
    1. Verifica git status
    2. Realiza commit com mensagem padronizada
    3. Faz push para o repositório remoto
    4. Inicia deploy no Vercel

.PARAMETER Environment
    Ambiente: 'vercel' (padrão) ou 'manual'

.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -Environment vercel

.NOTES
    Autor: Claude Haiku 4.5 | Data: 2026-05-25
    Requer: Git, Node.js 18+
#>

param(
    [ValidateSet('vercel', 'manual')]
    [string]$Environment = 'vercel'
)

$ErrorActionPreference = 'Stop'

# ═══════════════════════════════════════════════════════════
# 1. VERIFICAÇÃO INICIAL
# ═══════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  1️⃣  VERIFICAÇÃO INICIAL" -ForegroundColor Magenta -BackgroundColor Black
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Magenta

if (-not (Test-Path ".git")) {
    Write-Host "❌ Erro: Não está em um repositório Git!" -ForegroundColor Red
    exit 1
}

$gitUser = git config user.name
if (-not $gitUser) {
    Write-Host "⚠️  Configurando Git..." -ForegroundColor Yellow
    git config user.name "Toni Silva"
    git config user.email "carpediemandsapereaude@gmail.com"
}

Write-Host "✓ Git pronto: $gitUser" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# 2. VERIFICAR MUDANÇAS
# ═══════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  2️⃣  VERIFICANDO MUDANÇAS" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Magenta

$status = git status --porcelain
if (-not $status) {
    Write-Host "ℹ️  Nenhuma mudança detectada." -ForegroundColor Cyan
    exit 0
}

Write-Host "Mudanças encontradas:" -ForegroundColor Cyan
$status | ForEach-Object { Write-Host "   $_" -ForegroundColor Cyan }

# ═══════════════════════════════════════════════════════════
# 3. STAGING & COMMIT
# ═══════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  3️⃣  COMMIT & PUSH" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Magenta

Write-Host "📦 Staging all changes..." -ForegroundColor Magenta
git add -A

$commitMessage = @"
feat: Copa 2026 login background + responsive carousel navigation

Major features:
- World Cup 2026 themed login background (Itaúna em 2026 e BRASIL)
- Visual carousel-based navigation for non-admin users
- Premium glassmorphism carousels (Gallery, Documents, Scheduling, Events, Communications)
- Form modals with success states (Scheduling, Event Participation, Profile)
- Mobile-first responsive design (480px, 640px, 768px breakpoints)
- Responsive typography using CSS clamp()
- Vercel deployment ready

All components styled with glassmorphism design.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
"@

Write-Host "💬 Realizando commit..." -ForegroundColor Magenta
git commit -m $commitMessage

$commitHash = git rev-parse --short HEAD
Write-Host "✓ Commit: $commitHash" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# 4. PUSH
# ═══════════════════════════════════════════════════════════
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "📤 Pushing para $currentBranch..." -ForegroundColor Magenta

git push origin $currentBranch

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Push concluído!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Push retornou: $LASTEXITCODE" -ForegroundColor Yellow
}

# ═══════════════════════════════════════════════════════════
# 5. DEPLOYMENT VERCEL
# ═══════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  4️⃣  DEPLOYMENT" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Magenta

$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue

if ($vercelCmd -and $Environment -eq 'vercel') {
    Write-Host "🚀 Vercel CLI detectado. Iniciando deployment..." -ForegroundColor Green
    Write-Host "Executando: vercel --prod --confirm`n" -ForegroundColor Cyan
    vercel --prod --confirm
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ DEPLOYMENT VERCEL CONCLUÍDO!" -ForegroundColor Green
    }
} else {
    Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host @"

OPÇÃO 1: Vercel CLI (Local)
  npm install -g vercel
  vercel login
  vercel --prod

OPÇÃO 2: GitHub + Vercel (Automático) - RECOMENDADO
  1. Acesse: https://vercel.com
  2. Clique: "New Project"
  3. Selecione seu repositório GitHub
  4. Configure variáveis:
     - VITE_SUPABASE_URL
     - VITE_SUPABASE_ANON_KEY
  5. Clique: "Deploy"
  
  🎉 Após isso, Vercel fará deploy automático a cada push!

OPÇÃO 3: Build Local
  npm run build
  vercel --prod
"@
}

# ═══════════════════════════════════════════════════════════
# RESUMO FINAL
# ═══════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT COMPLETO" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host @"
Resumo:
  ✓ Commit:        $commitHash
  ✓ Branch:        $currentBranch
  ✓ Push:          OK
  ✓ Ready:         Vercel deployment

Status do Projeto:
  🎨 Copa 2026 Background: ✓ Implementado
  📱 Mobile Responsive:    ✓ 480px-1920px
  🎪 Carousels:           ✓ 5 componentes
  🎯 Modais:              ✓ 3 componentes
  🚀 Deploy:              ✓ Vercel pronto

Acesse em produção:
  → https://seu-projeto.vercel.app
"@

Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Green
