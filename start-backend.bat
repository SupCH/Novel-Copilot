@echo off
chcp 65001 >nul
title Novel-Copilot 后端

cd /d "%~dp0backend"

echo ================================
echo   Novel-Copilot 后端服务
echo ================================
echo.

:: 检查 Python 虚拟环境
if exist "..\..\.venv\Scripts\activate.bat" (
    echo 激活虚拟环境...
    call "..\..\..\.venv\Scripts\activate.bat"
) else if exist "venv\Scripts\activate.bat" (
    call "venv\Scripts\activate.bat"
)

echo 启动后端服务 (端口 3506)...
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 3506

pause
