# ================================================================
# DEPLOY via SCP — Condomínio Itaúna → VPS Hostinger
# Uso: .\deploy\deploy-scp.ps1
# ================================================================

$VPS_IP   = "191.101.71.74"
$VPS_USER = "root"
$VPS_PATH = "/var/www/itauna"

Write-Host "🏗️  Gerando build de producao..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build falhou!" -ForegroundColor Red; exit 1 }

Write-Host "📁  Preparando diretorio na VPS..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_IP}" "mkdir -p ${VPS_PATH} && rm -rf ${VPS_PATH}/*"

Write-Host "🚀  Enviando arquivos..." -ForegroundColor Cyan
scp -r dist/* "${VPS_USER}@${VPS_IP}:${VPS_PATH}/"

Write-Host "🐳  Reiniciando container Nginx..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_IP}" @"
docker stop itauna 2>/dev/null || true
docker rm   itauna 2>/dev/null || true
docker run -d \
  --name itauna \
  --restart unless-stopped \
  -p 3000:80 \
  -v ${VPS_PATH}:/usr/share/nginx/html:ro \
  -v /root/itauna-nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine
echo '✅ Container nginx rodando na porta 3000'
"@

Write-Host "✅ Deploy concluido! Configure itauna.org no Coolify apontando para porta 3000." -ForegroundColor Green
