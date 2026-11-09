@echo off
cd /d "%~dp0"
where python >nul 2>&1
if errorlevel 1 (
  echo Install Python 3.12 or newer from python.org, then run this file again.
  pause
  exit /b 1
)
if not exist .venv\Scripts\python.exe python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto failed
.venv\Scripts\python.exe manage.py migrate
if errorlevel 1 goto failed
.venv\Scripts\python.exe manage.py seed_demo
if errorlevel 1 goto failed
echo Open http://127.0.0.1:8000 in your browser. Press Ctrl+C to stop.
.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
pause
exit /b 0
:failed
echo Setup did not finish. Read the error above.
pause
exit /b 1
