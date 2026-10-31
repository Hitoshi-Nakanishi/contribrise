@echo off
cd /d "%~dp0"
start "" pythonw.exe "%~dp0src\contribrise\app.py" --open
