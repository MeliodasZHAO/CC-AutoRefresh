#!/bin/bash

# Ubuntu 云服务器自动化部署脚本

set -e

echo "🚀 开始部署 CC-AutoRefresh 到 Ubuntu 云服务器..."

# 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
echo "📦 安装 Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装必要的系统依赖（Playwright 需要）
echo "📦 安装 Playwright 系统依赖..."
sudo apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxss1 \
    libgtk-3-0 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrender1 \
    libxtst6 \
    libglib2.0-0 \
    libnss3-dev \
    libgconf-2-4 \
    libxss1 \
    libasound2 \
    libxtst6 \
    libatspi2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libgtk-3-0

# 检查项目目录
PROJECT_DIR="$HOME/cc-autorefresh"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 项目目录不存在: $PROJECT_DIR"
    echo "请先将项目文件上传到服务器"
    exit 1
fi

cd "$PROJECT_DIR"

# 安装项目依赖
echo "📦 安装项目依赖..."
npm install

# 安装 Playwright 浏览器（仅 Chromium）
echo "📦 安装 Playwright Chromium..."
npx playwright install chromium --with-deps

# 创建日志目录
mkdir -p logs

# 检查配置文件
if [ ! -f "config.json" ]; then
    echo "❌ 配置文件 config.json 不存在"
    echo "请确保配置文件已正确上传并包含登录凭据"
    exit 1
fi

# 设置为无头模式（云服务器必需）
echo "🔧 配置无头模式..."
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
config.automation.framework = 'headless';
config.automation.headless = true;
fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
console.log('配置已更新为无头模式');
"

# 测试运行
echo "🧪 测试运行..."
node src/main.js --test

if [ $? -eq 0 ]; then
    echo "✅ 测试运行成功！"
else
    echo "❌ 测试运行失败，请检查配置"
    exit 1
fi

# 设置 cron 定时任务
echo "⏰ 设置定时任务..."
chmod +x scripts/run_once.sh

# 备份现有 crontab
crontab -l > crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || echo "当前无 crontab 配置"

# 删除已存在的任务
crontab -l 2>/dev/null | grep -v "$PROJECT_DIR.*run_once.sh" | crontab - 2>/dev/null || true

# 添加新任务（北京时间 23:55）
CRON_JOB="55 23 * * * cd $PROJECT_DIR && TZ=Asia/Shanghai ./scripts/run_once.sh >> $PROJECT_DIR/logs/cron.out 2>&1"
(crontab -l 2>/dev/null || echo "") | { cat; echo "$CRON_JOB"; } | crontab -

echo ""
echo "🎉 部署完成！"
echo ""
echo "📋 部署信息："
echo "  项目目录: $PROJECT_DIR"
echo "  Node.js 版本: $(node --version)"
echo "  框架模式: 无头浏览器 (headless)"
echo "  定时任务: 每天北京时间 23:55 执行"
echo ""
echo "📝 管理命令："
echo "  手动测试: cd $PROJECT_DIR && node src/main.js --test"
echo "  查看日志: tail -f $PROJECT_DIR/logs/autorefresh.log"
echo "  查看 cron 日志: tail -f $PROJECT_DIR/logs/cron.out"
echo "  查看 cron 任务: crontab -l"
echo ""
echo "⚠️  注意事项："
echo "  1. 确保服务器时区设置正确或使用 TZ=Asia/Shanghai"
echo "  2. 首次运行前请检查 config.json 配置"
echo "  3. 云服务器需要足够的内存（建议至少 1GB）"
echo "  4. 定时任务日志在 logs/cron.out 中"
echo ""
echo "🔧 故障排除："
echo "  如果遇到字体或显示问题，运行："
echo "  sudo apt-get install -y fonts-liberation fonts-noto-color-emoji"