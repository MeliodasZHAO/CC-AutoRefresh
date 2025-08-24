@echo off
REM 积分重置自动化启动脚本 - Windows 版本

setlocal enabledelayedexpansion

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%..\"
set "LOG_DIR=%PROJECT_DIR%logs"

REM 创建日志目录
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

set "LOG_FILE=%LOG_DIR%\autorefresh.log"
set "ERROR_LOG=%LOG_DIR%\error.log"

REM 日志函数
call :log_info "开始执行积分重置自动化任务"

REM 切换到项目目录
cd /d "%PROJECT_DIR%"

REM 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    call :log_error "Node.js 未安装或不在 PATH 中"
    exit /b 1
)

REM 检查项目文件
if not exist "src\main.js" (
    call :log_error "项目文件不存在: src\main.js"
    exit /b 1
)

REM 安装依赖（如果需要）
if not exist "node_modules" (
    call :log_info "安装项目依赖..."
    npm install >> "%LOG_FILE%" 2>> "%ERROR_LOG%"
)

REM 执行自动化任务
call :log_info "执行自动化脚本..."
node src\main.js >> "%LOG_FILE%" 2>> "%ERROR_LOG%"

if errorlevel 1 (
    call :log_error "任务执行失败"
    exit /b 1
) else (
    call :log_info "任务执行完成"
    exit /b 0
)

REM 日志函数定义
:log_info
echo [%date% %time%] INFO: %~1 >> "%LOG_FILE%"
echo [%date% %time%] INFO: %~1
goto :eof

:log_error
echo [%date% %time%] ERROR: %~1 >> "%ERROR_LOG%"
echo [%date% %time%] ERROR: %~1
goto :eof