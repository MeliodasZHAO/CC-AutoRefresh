#!/bin/bash

# Ubuntu/Linux cron 设置脚本

set -e

# 脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RUN_SCRIPT="$SCRIPT_DIR/run_once.sh"

# 确保运行脚本有执行权限
chmod +x "$RUN_SCRIPT"

# cron 任务配置 - 启动长期运行进程
CRON_TIME="@reboot"  # 系统启动时运行
CRON_COMMAND="cd $PROJECT_DIR && TZ=Asia/Shanghai nohup node src/main.js >> $PROJECT_DIR/logs/cron.out 2>&1 &"
CRON_JOB="$CRON_TIME $CRON_COMMAND"

echo "设置 cron 定时任务..."
echo "时间: 系统启动时启动长期运行进程"
echo "命令: $CRON_COMMAND"

# 备份当前 crontab
echo "备份当前 crontab..."
crontab -l > crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || echo "当前无 crontab 配置"

# 检查是否已存在相同任务
if crontab -l 2>/dev/null | grep -q "$PROJECT_DIR.*run_once.sh"; then
    echo "检测到已存在的自动化任务，正在删除..."
    crontab -l 2>/dev/null | grep -v "$PROJECT_DIR.*run_once.sh" | crontab -
fi

# 添加新的 cron 任务
echo "添加新的 cron 任务..."
(crontab -l 2>/dev/null || echo "") | { cat; echo "$CRON_JOB"; } | crontab -

# 验证设置
echo ""
echo "cron 任务设置完成！当前配置："
crontab -l | grep "$PROJECT_DIR.*run_once.sh" || echo "未找到相关任务"

echo ""
echo "设置说明："
echo "1. 系统启动时会自动启动长期运行的监控进程"
echo "2. 每10分钟自动检查积分状态"
echo "3. 当积分 < 500 或时间到达23:55时自动重置"
echo "4. 日志文件位置: $PROJECT_DIR/logs/"
echo "5. 查看运行日志: tail -f $PROJECT_DIR/logs/cron.out"
echo ""
echo "管理命令："
echo "- 手动启动: cd $PROJECT_DIR && nohup node src/main.js > logs/manual.log 2>&1 &"
echo "- 查看进程: ps aux | grep 'node.*main.js'"
echo "- 停止进程: pkill -f 'node.*main.js'"
echo "- 单次测试: node src/main.js --test"
echo ""
echo "注意事项："
echo "- 进程会在后台持续运行"
echo "- 确保系统时区正确或使用 TZ=Asia/Shanghai"
echo "- 确保 Node.js 在 PATH 中可用"
echo "- 首次运行前请编辑 config.json 配置文件"