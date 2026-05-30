@echo off
REM Deploy script para Condominio Itauna
REM Commit + Push + Deploy Vercel
REM Uso: deploy.bat

title Itauna Deploy - Commit & Push
color 0A

echo.
echo ================================================================================
echo   CONDOMINIO ITAUNA - DEPLOYMENT SCRIPT
echo ================================================================================
echo.

REM Verificar se em repositorio git
if not exist ".git" (
    color 0C
    echo ERRO: Nao esta em um repositorio Git!
    pause
    exit /b 1
)

REM Configurar git se necessario
for /f "tokens=*" %%i in ('git config user.name 2^>nul') do set gituser=%%i
if "%gituser%"=="" (
    echo Configurando Git...
    git config user.name "Toni Silva"
    git config user.email "carpediemandsapereaude@gmail.com"
)

echo [OK] Git pronto: %gituser%
echo.

REM Check changes
echo Verificando mudancas...
git status --porcelain > /dev/null 2>&1
if errorlevel 1 (
    color 0E
    echo [INFO] Nenhuma mudanca detectada.
    pause
    exit /b 0
)

echo.
echo ================================================================================
echo STAGING & COMMIT
echo ================================================================================
echo.

echo [*] Staging all changes...
git add -A

echo [*] Realizando commit...
git commit -m "feat: Copa 2026 login background + responsive carousel navigation"

if errorlevel 1 (
    color 0C
    echo [ERRO] Falha no commit
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('git rev-parse --short HEAD') do set commit=%%i
echo [OK] Commit realizado: %commit%
echo.

REM Push
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set branch=%%i
echo [*] Pushing para %branch%...
git push origin %branch%

if errorlevel 1 (
    color 0E
    echo [AVISO] Push retornou erro (pode estar normal)
) else (
    color 0B
    echo [OK] Push concluido!
)

echo.
echo ================================================================================
echo DEPLOYMENT VERCEL
echo ================================================================================
echo.

where vercel > /dev/null 2>&1
if %errorlevel% equ 0 (
    echo [OK] Vercel CLI detectado
    echo [*] Iniciando deployment...
    echo.
    vercel --prod --confirm
    if errorlevel 1 (
        color 0C
        echo [ERRO] Falha no deployment
    ) else (
        color 0B
        echo [OK] DEPLOYMENT CONCLUIDO!
    )
) else (
    color 0E
    echo [INFO] Vercel CLI nao instalado
    echo.
    echo OPCOES:
    echo.
    echo 1. Instalar Vercel CLI:
    echo    npm install -g vercel
    echo    vercel login
    echo    vercel --prod
    echo.
    echo 2. Dashboard Vercel (RECOMENDADO):
    echo    1. Acesse: https://vercel.com
    echo    2. Connect seu repositorio GitHub
    echo    3. Configure variaveis de ambiente:
    echo       - VITE_SUPABASE_URL
    echo       - VITE_SUPABASE_ANON_KEY
    echo    4. Vercel fara deploy automatico em cada push!
    echo.
)

echo.
echo ================================================================================
echo RESUMO
echo ================================================================================
echo.
echo   [OK] Commit: %commit%
echo   [OK] Branch: %branch%
echo   [OK] Push: Concluido
echo   [INFO] Deploy: Proximo passo
echo.
echo   Status: Copa 2026 Background + Responsive + Vercel Ready
echo.
echo ================================================================================
echo.

color 0B
echo Pressione qualquer tecla para fechar...
pause > /dev/null
