@echo off
chcp 65001 >nul
echo ====== CC-AutoRefresh 状态检查 ======
echo.

:: 检查进程是否运行
tasklist /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *main.js*" 2>nul | find /I "node.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ 服务状态: 正在运行

    :: 显示进程信息
    echo.
    echo 📋 进程信息:
    for /f "tokens=2,5" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO table /NH 2^>nul') do (
        echo    PID: %%a  内存: %%b
    )
) else (
    echo ❌ 服务状态: 未运行
)

echo.

:: 检查锁文件
if exist ".autorefresh.lock" (
    echo 🔒 锁文件状态: 存在
    echo    内容:
    type .autorefresh.lock | findstr /C:"pid" /C:"startTime"
) else (
    echo 🔓 锁文件状态: 不存在
)

echo.

:: 检查日志文件
if exist "logs\service.log" (
    echo 📄 最新日志 (最后10行):
    echo ----------------------------------------
    powershell "Get-Content 'logs\service.log' | Select-Object -Last 10"
    echo ----------------------------------------
) else (
    echo 📄 日志文件: 不存在
)

echo.
echo 📊 使用情况统计:
if exist "logs\service.log" (
    echo    总日志行数:
    powershell "(Get-Content 'logs\service.log').Count"
    echo    日志文件大小:
    powershell "(Get-Item 'logs\service.log').Length / 1KB -as [int]" && echo KB
) else (
    echo    暂无日志记录
)

echo.
pause