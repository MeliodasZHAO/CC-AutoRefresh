@echo off
chcp 65001 >nul
echo 启动 CC-AutoRefresh 后台服务...

:: 创建logs目录（如果不存在）
if not exist "logs" mkdir logs

:: 启动程序并重定向输出到日志文件
echo [%date% %time%] 启动 CC-AutoRefresh >> logs\service.log
start /B node src\main.js >> logs\service.log 2>&1

:: 等待一下让程序启动
timeout /t 3 /nobreak >nul

:: 检查是否启动成功
call status.bat

echo.
echo 使用以下命令管理服务:
echo   status.bat  - 查看运行状态
echo   stop.bat    - 停止服务
echo   logs.bat    - 查看日志
echo   restart.bat - 重启服务
pause