@echo off
chcp 65001 >nul
powershell.exe -NoProfile -File "%~dp0lab-launcher.ps1" -Mode Stop
set "DC1_EXIT=%ERRORLEVEL%"
if not "%DC1_EXIT%"=="0" pause
exit /b %DC1_EXIT%
