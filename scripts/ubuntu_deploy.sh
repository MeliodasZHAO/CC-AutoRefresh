#!/bin/bash

# CC-AutoRefresh 一键自动部署脚本
# 适用于 Ubuntu 18.04+ / Debian 10+

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到root用户，建议使用普通用户运行"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查系统版本
check_system() {
    log_info "检查系统版本..."
    
    if [[ ! -f /etc/os-release ]]; then
        log_error "无法识别系统版本"
        exit 1
    fi
    
    source /etc/os-release
    log_success "检测到系统: $PRETTY_NAME"
    
    # 检查是否为支持的系统
    case $ID in
        ubuntu|debian)
            log_success "系统版本支持"
            ;;
        *)
            log_warning "未测试的系统，可能存在兼容性问题"
            ;;
    esac
}

# 更新系统包
update_system() {
    log_info "更新系统包..."
    sudo apt update -y
    sudo apt upgrade -y
    log_success "系统包更新完成"
}

# 安装Node.js 18
install_nodejs() {
    log_info "检查Node.js安装状态..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
        if [[ $NODE_VERSION -ge 18 ]]; then
            log_success "Node.js $NODE_VERSION 已安装"
            return 0
        else
            log_warning "Node.js版本过低 ($NODE_VERSION)，需要升级到18+"
        fi
    fi
    
    log_info "安装Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # 验证安装
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        log_success "Node.js $(node --version) 安装成功"
        log_success "npm $(npm --version) 安装成功"
    else
        log_error "Node.js安装失败"
        exit 1
    fi
}

# 安装项目依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    if [[ ! -f package.json ]]; then
        log_error "未找到package.json，请确认在正确的项目目录"
        exit 1
    fi
    
    npm install
    log_success "项目依赖安装完成"
    
    log_info "安装Playwright浏览器..."
    npx playwright install chromium --with-deps
    log_success "Playwright浏览器安装完成"
}

# 设置配置文件
setup_config() {
    log_info "设置配置文件..."
    
    if [[ ! -f config.example.json ]]; then
        log_error "未找到config.example.json模板文件"
        exit 1
    fi
    
    if [[ ! -f config.json ]]; then
        cp config.example.json config.json
        log_success "已创建config.json配置文件"
        
        echo
        log_warning "请编辑config.json文件，配置以下信息:"
        echo "  1. login.credentials - 你的登录用户名和密码"
        echo "  2. email.smtp - 你的邮箱SMTP配置"
        echo "  3. email.from/to - 发件人和收件人邮箱"
        echo
        
        read -p "现在是否打开配置文件进行编辑? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            nano config.json
        fi
    else
        log_success "config.json配置文件已存在"
    fi
}

# 创建日志目录
create_log_dir() {
    log_info "创建日志目录..."
    mkdir -p logs
    chmod 755 logs/
    log_success "日志目录创建完成"
}

# 设置脚本权限
set_permissions() {
    log_info "设置脚本执行权限..."
    
    if [[ -d scripts ]]; then
        chmod +x scripts/*.sh
        log_success "脚本权限设置完成"
    fi
    
    # 设置配置文件权限（安全性）
    if [[ -f config.json ]]; then
        chmod 600 config.json
        log_success "配置文件权限设置完成"
    fi
}

# 测试运行
test_run() {
    log_info "执行测试运行..."
    
    if npm run test; then
        log_success "测试运行成功！"
        return 0
    else
        log_error "测试运行失败，请检查配置"
        return 1
    fi
}

# 部署定时任务
deploy_cron() {
    log_info "部署定时任务..."
    
    echo
    echo "选择部署模式："
    echo "1) 双重保障模式 (推荐) - 积分监控 + 每日重置"
    echo "2) 传统模式 - 仅每日重置"
    echo
    
    read -p "请选择部署模式 (1-2): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            if [[ -f scripts/setup_dual_cron.sh ]]; then
                ./scripts/setup_dual_cron.sh
                log_success "双重保障模式部署完成"
            else
                log_error "未找到双重模式部署脚本"
                return 1
            fi
            ;;
        2)
            if [[ -f scripts/setup_cron.sh ]]; then
                ./scripts/setup_cron.sh
                log_success "传统模式部署完成"
            else
                log_error "未找到传统模式部署脚本"
                return 1
            fi
            ;;
        *)
            log_warning "跳过定时任务部署，稍后可手动运行相关脚本"
            ;;
    esac
}

# 验证部署
verify_deployment() {
    log_info "验证部署状态..."
    
    # 检查cron任务
    if crontab -l > /dev/null 2>&1; then
        CRON_COUNT=$(crontab -l | grep -c "CC-AutoRefresh" || true)
        if [[ $CRON_COUNT -gt 0 ]]; then
            log_success "定时任务配置正常 ($CRON_COUNT 个任务)"
        else
            log_warning "未检测到定时任务"
        fi
    else
        log_warning "无法访问cron配置"
    fi
    
    # 检查进程（如果监控模式正在运行）
    MONITOR_COUNT=$(ps aux | grep -c "node.*monitor" || true)
    if [[ $MONITOR_COUNT -gt 1 ]]; then
        log_success "积分监控进程运行正常"
    else
        log_info "积分监控进程未运行（正常，将由cron启动）"
    fi
    
    # 检查日志目录
    if [[ -d logs ]]; then
        log_success "日志目录创建正常"
    fi
}

# 显示后续操作指南
show_next_steps() {
    echo
    log_success "🎉 CC-AutoRefresh 部署完成！"
    echo
    echo "📋 后续操作："
    echo "  1. 确认config.json中的配置信息正确"
    echo "  2. 监控日志文件："
    echo "     - 积分监控: tail -f logs/monitor.log"
    echo "     - 每日重置: tail -f logs/daily-reset.log" 
    echo "  3. 手动测试: npm run test"
    echo "  4. 查看定时任务: crontab -l"
    echo
    echo "📊 管理命令："
    echo "  - 查看监控进程: ps aux | grep 'node.*monitor'"
    echo "  - 停止监控进程: pkill -f 'node.*monitor'"
    echo "  - 手动启动监控: nohup npm run monitor > logs/monitor.log 2>&1 &"
    echo "  - 手动重置积分: npm run daily-reset"
    echo
}

# 主函数
main() {
    echo "======================================"
    echo "  CC-AutoRefresh 一键自动部署脚本"
    echo "======================================"
    echo
    
    # 执行检查和部署步骤
    check_root
    check_system
    update_system
    install_nodejs
    install_dependencies
    setup_config
    create_log_dir
    set_permissions
    
    # 测试运行
    if test_run; then
        deploy_cron
        verify_deployment
        show_next_steps
    else
        log_error "部署过程中遇到错误，请检查配置文件后重试"
        echo
        echo "💡 建议操作："
        echo "  1. 编辑配置: nano config.json"
        echo "  2. 重新测试: npm run test"
        echo "  3. 再次部署: ./scripts/ubuntu_deploy.sh"
        exit 1
    fi
}

# 运行主函数
main "$@"