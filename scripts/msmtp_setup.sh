#!/bin/bash

# msmtp 邮件配置脚本（Ubuntu/Linux）

set -e

echo "开始配置 msmtp 邮件服务..."

# 安装 msmtp
if ! command -v msmtp &> /dev/null; then
    echo "安装 msmtp..."
    sudo apt update
    sudo apt install -y msmtp msmtp-mta
fi

# 创建配置目录
mkdir -p ~/.config/msmtp

# msmtp 配置文件
MSMTP_CONFIG="$HOME/.msmtprc"

echo "创建 msmtp 配置文件: $MSMTP_CONFIG"

cat > "$MSMTP_CONFIG" << 'EOF'
# msmtp 配置文件
# 编辑此文件，填入你的邮箱信息

# 默认设置
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        ~/.msmtp.log

# Gmail 账户配置
account        gmail
host           smtp.gmail.com
port           587
user           your-email@gmail.com  # 替换为你的邮箱
passwordeval   "cat ~/.config/msmtp/gmail_app_password"
from           your-email@gmail.com  # 替换为你的邮箱

# QQ 邮箱配置（备选）
account        qq
host           smtp.qq.com
port           587
user           your-email@qq.com     # 替换为你的QQ邮箱
passwordeval   "cat ~/.config/msmtp/qq_auth_code"
from           your-email@qq.com     # 替换为你的QQ邮箱

# 默认账户
account default : gmail
EOF

# 设置配置文件权限
chmod 600 "$MSMTP_CONFIG"

echo ""
echo "配置文件已创建: $MSMTP_CONFIG"
echo ""
echo "下一步："
echo "1. 编辑配置文件，填入你的邮箱地址"
echo "2. 创建密码文件："
echo ""
echo "   对于 Gmail："
echo "   echo '你的应用专用密码' > ~/.config/msmtp/gmail_app_password"
echo "   chmod 600 ~/.config/msmtp/gmail_app_password"
echo ""
echo "   对于 QQ 邮箱："
echo "   echo '你的授权码' > ~/.config/msmtp/qq_auth_code"
echo "   chmod 600 ~/.config/msmtp/qq_auth_code"
echo ""
echo "3. 测试发送邮件："
echo "   echo '这是测试邮件' | msmtp your-email@example.com"
echo ""
echo "注意："
echo "- Gmail 需要开启两步验证并生成应用专用密码"
echo "- QQ 邮箱需要开启SMTP服务并获取授权码"
echo "- 企业邮箱请参考相应的SMTP配置"