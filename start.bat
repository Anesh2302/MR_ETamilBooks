@echo off
title ETamil Server

echo ============================================
echo   ETamil - Tamil Ebook Translator Platform
echo ============================================
echo.

:: Start Backend (Express + MySQL)
echo [1/3] Starting Backend API server on port 4000...
start "ETamil Backend" cmd /c "node D:\ETamil\backend\server.js"

:: Wait a moment
timeout /t 2 /nobreak >nul

:: Start Frontend (Next.js)
echo [2/3] Starting Frontend on port 3000...
start "ETamil Frontend" cmd /c "cd /d D:\tamil-ebook-translator\web && npx next dev -p 3000"

:: Start Adminer (DB management UI via PHP)
echo [3/3] Starting Adminer (Database Manager) on port 8080...
start "Adminer" cmd /c "D:\ETamil\php\php.exe -S localhost:8080 -t D:\ETamil D:\ETamil\adminer.php"

echo.
echo ============================================
echo   Backend:  http://localhost:4000
echo   Frontend: http://localhost:3000
echo   Adminer:  http://localhost:8080 (if PHP installed)
echo ============================================
echo.
echo Database: MySQL (root on localhost:3306) — see backend/.env
echo Backend:  D:\ETamil\backend (Express + MySQL)
echo Frontend: D:\tamil-ebook-translator\web (Next.js)
echo Login:    admin — see backend/.env
echo ============================================
echo.
