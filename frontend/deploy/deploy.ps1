# ================================================================
# DEPLOY — Condomínio Itaúna → VPS Hostinger
# Uso: .\deploy\deploy.ps1
# ================================================================

$VPS_IP   = "191.101.71.74"
$VPS_USER = "root"
$VPS_PATH = "/var/www/itauna"
$DIST     = "dist"

Write-Host "🏗️  Gerando build de produção..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build falhou!" -ForegroundColor Red; exit 1 }

Write-Host "📦  Enviando arquivos para a VPS..." -ForegroundColor Cyan
# Cria diretório na VPS se não existir
ssh "${VPS_USER}@${VPS_IP}" "mkdir -p ${VPS_PATH}/dist"

# Envia a pasta dist
scp -r "${DIST}/*" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/dist/"

Write-Host "⚙️  Configurando Nginx..." -ForegroundColor Cyan
scp "deploy\nginx-itauna.conf" "${VPS_USER}@${VPS_IP}:/etc/nginx/sites-available/itauna"

ssh "${VPS_USER}@${VPS_IP}" @"
  ln -sf /etc/nginx/sites-available/itauna /etc/nginx/sites-enabled/itauna
  nginx -t && systemctl reload nginx
  echo '✅ Nginx recarregado!'
"@

Write-Host "✅ Deploy concluído! Acesse https://itauna.org" -ForegroundColor Green
