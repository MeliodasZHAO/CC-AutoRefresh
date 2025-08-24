#!/bin/bash

# 双任务 cron 设置脚本 - 分离积分监控和定时重置

set -e

# 脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "设置双任务 cron 定时任务..."
echo "项目目录: $PROJECT_DIR"

# cron 任务配置
MONITOR_JOB="@reboot cd $PROJECT_DIR && TZ=Asia/Shanghai nohup node src/main.js --mode=monitor >> $PROJECT_DIR/logs/monitor.log 2>&1 &"
DAILY_RESET_JOB="55 23 * * * cd $PROJECT_DIR && TZ=Asia/Shanghai node src/main.js --mode=daily-reset >> $PROJECT_DIR/logs/daily-reset.log 2>&1"

echo ""
echo "任务1 - 积分监控 (持续运行):"
echo "时间: 系统启动时启动"
echo "功能: 每10分钟检查积分，低于500时自动重置"
echo "命令: $MONITOR_JOB"
echo ""
echo "任务2 - 每日定时重置:"
echo "时间: 每天北京时间 23:55"
echo "功能: 强制重置积分（无论当前积分多少）"
echo "命令: $DAILY_RESET_JOB"

# 备份当前 crontab
echo ""
echo "备份当前 crontab..."
crontab -l > crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || echo "当前无 crontab 配置"

# 删除已存在的相关任务
echo "删除已存在的相关任务..."
crontab -l 2>/dev/null | grep -v "$PROJECT_DIR.*main.js" | crontab - 2>/dev/null || true

# 添加新任务
echo "添加新的双任务配置..."
(crontab -l 2>/dev/null || echo "") | { 
  cat; 
  echo "# CC-AutoRefresh 积分监控 (持续运行)"; 
  echo "$MONITOR_JOB"; 
  echo "# CC-AutoRefresh 每日定时重置"; 
  echo "$DAILY_RESET_JOB"; 
} | crontab -

# 验证设置
echo ""
echo "cron 任务设置完成！当前配置："
crontab -l | grep -A1 -B1 "CC-AutoRefresh" || echo "未找到相关任务"

echo ""
echo "设置说明："
echo "1. 【积分监控】系统启动时自动启动，每10分钟检查积分"
echo "   - 当积分 < 500 时自动重置"
echo "   - 日志: $PROJECT_DIR/logs/monitor.log"
echo ""
echo "2. 【定时重置】每天23:55强制重置"
echo "   - 无论积分多少都会重置"
echo "   - 日志: $PROJECT_DIR/logs/daily-reset.log"
echo ""
echo "管理命令："
echo "- 查看监控进程: ps aux | grep 'node.*main.js.*monitor'"
echo "- 停止监控进程: pkill -f 'node.*main.js.*monitor'"
echo "- 手动启动监控: cd $PROJECT_DIR && nohup node src/main.js --mode=monitor > logs/monitor.log 2>&1 &"
echo "- 手动执行重置: cd $PROJECT_DIR && node src/main.js --mode=daily-reset"
echo "- 单次测试: cd $PROJECT_DIR && node src/main.js --test"
echo ""
echo "日志查看："
echo "- 积分监控日志: tail -f $PROJECT_DIR/logs/monitor.log"
echo "- 定时重置日志: tail -f $PROJECT_DIR/logs/daily-reset.log"
echo ""
echo "注意事项："
echo "- 监控进程会在后台持续运行"
echo "- 定时重置每天只执行一次（23:55）"
echo "- 两个任务独立运行，互不影响"
echo "- 确保系统时区正确或使用 TZ=Asia/Shanghai"