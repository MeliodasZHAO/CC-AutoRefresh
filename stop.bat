@echo off
chcp 65001 >nul
echo ====== 停止 CC-AutoRefresh 服务 ======
echo.

:: 检查是否有实例在运行
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未发现运行中的服务
    goto cleanup
)

echo 🔍 发现运行中的Node.js进程，正在识别目标进程...

:: 查找并终止相关的node.exe进程
set found=0
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO csv /NH') do (
    set pid=%%i
    set pid=!pid:"=!

    :: 检查是否是我们的进程（通过命令行参数）
    wmic process where "ProcessId=!pid!" get CommandLine /value 2>nul | find "main.js" >nul
    if !ERRORLEVEL! EQU 0 (
        echo ✅ 找到目标进程 PID: !pid!
        echo 🛑 正在停止服务...
        taskkill /PID !pid! /F >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo ✅ 服务已停止
            set found=1
        ) else (
            echo ❌ 停止服务失败
        )
    )
)

if %found%==0 (
    echo ❌ 未找到 CC-AutoRefresh 相关进程
    echo 💡 尝试终止所有可疑的node.exe进程？
    set /p choice=输入 y 确认, 其他键取消:
    if /I "!choice!"=="y" (
        taskkill /IM node.exe /F >nul 2>&1
        echo ⚠️ 已终止所有node.exe进程
    )
)

:cleanup
echo.
echo 🧹 清理资源...

:: 删除锁文件
if exist ".autorefresh.lock" (
    del /q ".autorefresh.lock" >nul 2>&1
    echo ✅ 锁文件已清理
) else (
    echo ℹ️ 无锁文件需要清理
)

:: 记录停止时间到日志
echo [%date% %time%] 服务已停止 >> logs\service.log 2>nul

echo.
echo ✅ 停止操作完成
echo.
pause