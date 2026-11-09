@echo off
chcp 65001 >nul
title Instalador e Inicializador - Plataforma AVALIA AB (Agua Boa - MT)
cd /d "%~dp0"

echo ============================================================================
echo   PLATAFORMA AVALIA AB - PREFEITURA MUNICIPAL DE AGUA BOA - MT
echo   Configuracao Automatica em Nova Maquina (Codigo Fonte + Banco de Dados)
echo ============================================================================
echo.

:: 1. Verifica se já existe ambiente virtual funcional; se não, cria um novo
if not exist ".venv\Scripts\python.exe" (
    echo [1/3] Criando ambiente virtual Python local (.venv)...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERRO] Python 3 nao encontrado no PATH desta maquina.
        echo Instale o Python 3.11+ em https://www.python.org/downloads/ marcando "Add Python to PATH".
        pause
        exit /b 1
    )
)

echo [2/3] Instalando/verificando dependencias da plataforma (requirements.txt)...
".venv\Scripts\python.exe" -m pip install --upgrade pip >nul 2>&1
".venv\Scripts\python.exe" -m pip install -r requirements.txt

echo.
echo [3/3] Iniciando servidor da Plataforma AVALIA AB em http://localhost:8050 ...
echo O navegador sera aberto automaticamente em 3 segundos.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:8050"
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8050 --reload --no-server-header
pause

