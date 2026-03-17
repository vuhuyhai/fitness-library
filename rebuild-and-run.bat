@echo off
chcp 65001 >nul
title Fitness Library - Rebuilding...

echo.
echo ╔══════════════════════════════════════╗
echo ║   Fitness Library - Auto Rebuild     ║
echo ╚══════════════════════════════════════╝
echo.

echo [0/2] Dang tat app cu (neu dang chay)...
taskkill /f /im FitnessLibrary.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo [1/2] Dang build app, vui long cho...
echo.

cd /d "%~dp0"
"C:\Users\ASUS\go\bin\wails.exe" build -platform windows/amd64 -ldflags "-s -w" -clean

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [LOI] Build that bai! Kiem tra log phia tren.
    pause
    exit /b 1
)

echo.
echo [2/2] Build thanh cong! Dang mo app...
echo.

start "" "build\bin\FitnessLibrary.exe"

exit
