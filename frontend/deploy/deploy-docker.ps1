# ================================================================
# DEPLOY via Docker → VPS Hostinger (Coolify)
# Uso: .\deploy\deploy-docker.ps1
# ================================================================

$VPS_IP    = "191.101.71.74"
$VPS_USER  = "root"
$IMAGE     = "itauna-frontend"
$TAG       = "latest"
$TAR_FILE  = "itauna-frontend.tar"

Write-Host "🐳 Build da imagem Docker..." -ForegroundColor Cyan
docker build -t "${IMAGE}:${TAG}" .
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build Docker falhou!" -ForegroundColor Red; exit 1 }

Write-Host "📦 Exportando imagem..." -ForegroundColor Cyan
docker save -o $TAR_FILE "${IMAGE}:${TAG}"

Write-Host "🚀 Enviando para VPS ($VPS_IP)..." -ForegroundColor Cyan
scp $TAR_FILE "${VPS_USER}@${VPS_IP}:/root/"

Write-Host "⚙️  Carregando e executando na VPS..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_IP}" @"
  docker load -i /root/$TAR_FILE
  docker stop itauna 2>/dev/null || true
  docker rm   itauna 2>/dev/null || true
  docker run -d \
    --name itauna \
    --restart unless-stopped \
    -p 3000:80 \
    --label 'caddy=itauna.org' \
    ${IMAGE}:${TAG}
  rm /root/$TAR_FILE
  echo '✅ Container rodando!'
"@

Remove-Item $TAR_FILE -ErrorAction SilentlyContinue
Write-Host "✅ Deploy concluído! Configure o domínio no Coolify." -ForegroundColor Green
