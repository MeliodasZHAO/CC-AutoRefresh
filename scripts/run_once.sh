#!/bin/bash

# 积分重置自动化启动脚本
# 适用于 Linux/Ubuntu 系统

set -e

# 脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 日志文件
LOG_FILE="$PROJECT_DIR/logs/autorefresh.log"
ERROR_LOG="$PROJECT_DIR/logs/error.log"

# 确保日志目录存在
mkdir -p "$PROJECT_DIR/logs"

# 日志函数
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$ERROR_LOG"
}

# 主程序
main() {
    log_info "开始执行积分重置自动化任务"
    
    # 切换到项目目录
    cd "$PROJECT_DIR"
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    # 检查项目文件
    if [ ! -f "src/main.js" ]; then
        log_error "项目文件不存在: src/main.js"
        exit 1
    fi
    
    # 安装依赖（如果需要）
    if [ ! -d "node_modules" ]; then
        log_info "安装项目依赖..."
        npm install >> "$LOG_FILE" 2>> "$ERROR_LOG"
    fi
    
    # 执行自动化任务
    log_info "执行自动化脚本..."
    if node src/main.js >> "$LOG_FILE" 2>> "$ERROR_LOG"; then
        log_info "任务执行完成"
        exit 0
    else
        log_error "任务执行失败"
        exit 1
    fi
}

# 错误处理
trap 'log_error "脚本执行异常退出"' ERR

# 运行主程序
main "$@"