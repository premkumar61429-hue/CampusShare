@echo off
title CampusShare Pro - Server
echo =======================================================
echo          Starting CampusShare Pro Platform...
echo =======================================================
cd /d "%~dp0"

if not exist node_modules (
  echo [Info] Installing dependencies for first time run...
  call npm install
)

echo [Info] Launching CampusShare Pro Server on http://localhost:3000 ...
call npm start
pause
