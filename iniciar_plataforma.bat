@echo off
title AVALIA AB - Servidor Oficial (Porta 8050)
cd /d "%~dp0"
echo Iniciando Plataforma AVALIA AB em http://localhost:8050 ...
start "" "http://localhost:8050"
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8050 --reload --no-server-header
pause

