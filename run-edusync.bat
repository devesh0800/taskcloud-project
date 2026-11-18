@echo off
echo ========================================================
echo        EduSync - Starting Phase 1 Full Stack
echo ========================================================
echo.
echo [1/2] Starting Express Backend (Port 5000)...
start "EduSync Backend API" cmd /k "cd apps\api && npm run dev"

echo [2/2] Starting Next.js Web Frontend (Port 3000)...
start "EduSync Web Frontend" cmd /k "cd apps\web && npm run dev"

echo.
echo ========================================================
echo EduSync is launching!
echo Backend Health: http://localhost:5000/api/v1/health
echo Frontend Web:   http://localhost:3000
echo ========================================================
