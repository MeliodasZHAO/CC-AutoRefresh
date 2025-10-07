@echo off
chcp 65001 >nul
echo ====== 重启 CC-AutoRefresh 服务 ======
echo.

echo 🛑 正在停止现有服务...
call stop.bat

echo.
echo ⏳ 等待3秒确保完全停止...
timeout /t 3 /nobreak >nul

echo.
echo 🚀 重新启动服务...
call start.bat