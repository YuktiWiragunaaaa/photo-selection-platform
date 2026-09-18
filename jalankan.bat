@echo off
REM ==========================================================
REM  Pilih Foto - jalankan dalam mode production (cepat)
REM  1) build tampilan website   2) nyalakan server di port 8000
REM  Setelah muncul "Uvicorn running", buka http://localhost:8000/admin
REM  Untuk ngrok, di jendela lain:  ngrok http 8000 --url=DOMAIN-KAMU
REM ==========================================================

echo.
echo [1/2] Menyiapkan tampilan website (build)...
cd /d "%~dp0frontend"
call npm run build
if errorlevel 1 (
  echo.
  echo Build gagal. Screenshot pesan error di atas lalu kirim ke Claude.
  pause
  exit /b 1
)

echo.
echo [2/2] Menyalakan server...
cd /d "%~dp0backend"
if exist "venv\Scripts\activate.bat" (
  call venv\Scripts\activate.bat
) else if exist "..\venv\Scripts\activate.bat" (
  call ..\venv\Scripts\activate.bat
)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
