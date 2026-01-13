@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title Novel-Copilot Launcher

:menu
cls
echo ========================================
echo        Novel-Copilot Launcher
echo ========================================
echo.
echo   [1] Start All (Backend + Frontend)
echo   [2] Backend Only (FastAPI :3506)
echo   [3] Frontend Only (Next.js :3505)
echo   [4] Restart All
echo   [5] Stop All
echo   [0] Exit
echo.
set /p choice=Select: 

if "%choice%"=="1" goto start_all
if "%choice%"=="2" goto start_backend
if "%choice%"=="3" goto start_frontend
if "%choice%"=="4" goto restart_all
if "%choice%"=="5" goto stop_all
if "%choice%"=="0" exit
goto menu

:start_all
echo.
echo [Starting] Backend...
start "Novel-Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --reload --host 0.0.0.0 --port 3506"
timeout /t 2 /nobreak >nul
echo [Starting] Frontend...
:: 使用 npx 直接启动，避免 npm 参数传递问题
start "Novel-Frontend" cmd /k "cd /d %~dp0frontend && npx next dev -p 3505"
echo.
echo ========================================
echo  Backend:  http://localhost:3506
echo  Frontend: http://localhost:3505
echo  API Docs: http://localhost:3506/docs
echo ========================================
timeout /t 3 /nobreak >nul
goto menu

:start_backend
echo.
start "Novel-Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --reload --host 0.0.0.0 --port 3506"
echo Backend: http://localhost:3506
timeout /t 2 /nobreak >nul
goto menu

:start_frontend
echo.
start "Novel-Frontend" cmd /k "cd /d %~dp0frontend && npx next dev -p 3505"
echo Frontend: http://localhost:3505
timeout /t 2 /nobreak >nul
goto menu

:restart_all
echo.
echo [Stopping] Closing services...
taskkill /FI "WINDOWTITLE eq Novel-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Novel-Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3506') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3505') do taskkill /PID %%a /F >nul 2>&1
timeout /t 2 /nobreak >nul
goto start_all

:stop_all
echo.
echo [Stopping] Closing all services...
taskkill /FI "WINDOWTITLE eq Novel-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Novel-Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3506') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3505') do taskkill /PID %%a /F >nul 2>&1
echo Services stopped.
timeout /t 2 /nobreak >nul
goto menu
