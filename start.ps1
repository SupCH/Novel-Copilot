# Novel-Copilot 启动器
# 后端端口: 3506 | 前端端口: 3505

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Novel-Copilot"

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $ScriptDir) {
    $ScriptDir = "D:\Tools\Novel-Copilot"
}

function Show-Menu {
    Clear-Host
    Write-Host "========================================"
    Write-Host "       Novel-Copilot 启动器"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "  [1] 启动所有服务 (后端 + 前端)"
    Write-Host "  [2] 仅启动后端 (FastAPI :3506)"
    Write-Host "  [3] 仅启动前端 (Next.js :3505)"
    Write-Host "  [4] 重启所有服务"
    Write-Host "  [5] 停止所有服务"
    Write-Host "  [0] 退出"
    Write-Host ""
}

function Start-Backend {
    Write-Host "[启动] 后端服务..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\backend'; uvicorn main:app --reload --port 3506"
}

function Start-Frontend {
    Write-Host "[启动] 前端服务..." -ForegroundColor Cyan
    # 使用 npx 直接启动，避免 npm 参数传递问题
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\frontend'; npx next dev -p 3505"
}

function Stop-All {
    Write-Host "[停止] 正在关闭服务..." -ForegroundColor Yellow
    try {
        $backend = Get-NetTCPConnection -LocalPort 3506 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        $frontend = Get-NetTCPConnection -LocalPort 3505 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($backend) { Stop-Process -Id $backend -Force -ErrorAction SilentlyContinue }
        if ($frontend) { Stop-Process -Id $frontend -Force -ErrorAction SilentlyContinue }
    }
    catch {}
    
    try {
        Get-Process -Name "uvicorn" -ErrorAction SilentlyContinue | Where-Object { $_.Path -match "Novel-Copilot" } | Stop-Process -Force -ErrorAction SilentlyContinue
    }
    catch {}

    Write-Host "服务已停止" -ForegroundColor Green
}

try {
    while ($true) {
        Show-Menu
        $choice = Read-Host "请选择操作"
        
        switch ($choice) {
            "1" {
                Start-Backend
                Start-Sleep -Seconds 2
                Start-Frontend
                Write-Host ""
                Write-Host "========================================"
                Write-Host "  服务已启动!" -ForegroundColor Green
                Write-Host "  后端: http://localhost:3506"
                Write-Host "  前端: http://localhost:3505"
                Write-Host "  API文档: http://localhost:3506/docs"
                Write-Host "========================================"
                Start-Sleep -Seconds 3
            }
            "2" {
                Start-Backend
                Write-Host "后端已启动: http://localhost:3506" -ForegroundColor Green
                Start-Sleep -Seconds 2
            }
            "3" {
                Start-Frontend
                Write-Host "前端已启动: http://localhost:3505" -ForegroundColor Green
                Start-Sleep -Seconds 2
            }
            "4" {
                Stop-All
                Start-Sleep -Seconds 2
                Start-Backend
                Start-Sleep -Seconds 2
                Start-Frontend
                Write-Host "服务已重启!" -ForegroundColor Green
                Start-Sleep -Seconds 3
            }
            "5" {
                Stop-All
                Start-Sleep -Seconds 2
            }
            "0" {
                exit
            }
        }
    }
}
catch {
    Write-Host "发生错误: $_" -ForegroundColor Red
    Read-Host "按回车键退出"
}
