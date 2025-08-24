# 🚀 CC-AutoRefresh 完整部署指南

## 📋 部署步骤总览

1. [上传到GitHub](#1-上传到github)
2. [服务器环境准备](#2-服务器环境准备)  
3. [XShell连接服务器](#3-xshell连接服务器)
4. [克隆项目到服务器](#4-克隆项目到服务器)
5. [配置和部署](#5-配置和部署)
6. [验证和监控](#6-验证和监控)

---

## 1. 上传到GitHub

### 1.1 本地Git初始化
```bash
# 在项目目录下执行
cd Z:\CodeProject\CC-AutoRefresh

# 初始化Git仓库
git init

# 添加所有文件
git add .

# 提交到本地仓库
git commit -m "Initial commit: CC-AutoRefresh智能积分管理系统"
```

### 1.2 创建GitHub仓库
1. 访问 [GitHub.com](https://github.com) 并登录
2. 点击右上角 "+" → "New repository"
3. 填写信息：
   - Repository name: `CC-AutoRefresh`
   - Description: `智能积分自动重置工具 - 双重保障机制`
   - 选择 "Public" 或 "Private"
   - **不要**勾选 "Add a README file"（已有README.md）

### 1.3 推送到GitHub
```bash
# 添加远程仓库（替换为你的GitHub用户名）
git remote add origin https://github.com/YOUR-USERNAME/CC-AutoRefresh.git

# 推送到GitHub
git branch -M main
git push -u origin main
```

---

## 2. 服务器环境准备

### 2.1 服务器要求
- **系统**: Ubuntu 18.04+ / Debian 10+
- **内存**: 至少 1GB RAM  
- **网络**: 能访问github.com和目标网站
- **权限**: 有sudo权限的用户账户

### 2.2 防火墙设置（如果需要）
```bash
# 允许SSH连接（端口22）
sudo ufw allow 22

# 启用防火墙
sudo ufw enable
```

---

## 3. XShell连接服务器

### 3.1 创建新连接
1. 打开XShell
2. 点击"新建会话"
3. 填写连接信息：
   - **名称**: CC-AutoRefresh-Server
   - **协议**: SSH
   - **主机**: 你的服务器IP地址
   - **端口**: 22（默认）

### 3.2 配置用户认证
1. 点击"用户身份验证"
2. **方法**: Password 或 Public Key
3. **用户名**: 你的服务器用户名
4. **密码**: 你的服务器密码（或密钥）

### 3.3 连接服务器
1. 点击"连接"
2. 首次连接选择"接受并保存"SSH密钥
3. 成功连接后应该看到Ubuntu命令提示符

---

## 4. 克隆项目到服务器

### 4.1 克隆仓库
```bash
# 切换到home目录
cd ~

# 克隆项目（替换为你的GitHub用户名）
git clone https://github.com/YOUR-USERNAME/CC-AutoRefresh.git

# 进入项目目录
cd CC-AutoRefresh

# 查看项目结构
ls -la
```

### 4.2 设置脚本权限
```bash
# 给所有脚本添加执行权限
chmod +x scripts/*.sh

# 验证权限
ls -la scripts/
```

---

## 5. 配置和部署

### 5.1 一键自动部署（推荐）
```bash
# 运行自动部署脚本
./scripts/ubuntu_deploy.sh
```

### 5.2 手动分步部署

#### 步骤1: 系统依赖安装
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 步骤2: 项目依赖安装
```bash
# 安装项目依赖
npm install

# 安装Playwright浏览器
npx playwright install chromium --with-deps
```

#### 步骤3: 配置文件设置
```bash
# 复制配置模板
cp config.example.json config.json

# 编辑配置文件
nano config.json
```

**重要配置项**:
```json
{
  "login": {
    "credentials": {
      "username": "你的用户名",
      "password": "你的密码"
    }
  },
  "email": {
    "smtp": {
      "user": "你的邮箱@163.com",
      "password": "你的163邮箱授权码"
    },
    "from": "你的邮箱@163.com",
    "to": "接收报警的邮箱@qq.com"
  }
}
```

#### 步骤4: 测试运行
```bash
# 测试单次运行
npm run test

# 如果成功，应该看到类似输出：
# 📊 当前积分: 18,xxx/20,000 (xx%)
# ✨ 积分状态: 18,xxx/20,000 (xx%)
```

#### 步骤5: 部署定时任务
```bash
# 部署双任务cron（推荐）
./scripts/setup_dual_cron.sh

# 或者传统单任务
./scripts/setup_cron.sh
```

---

## 6. 验证和监控

### 6.1 验证部署
```bash
# 查看cron任务
crontab -l

# 查看运行中的进程
ps aux | grep "node.*main.js"

# 手动启动监控进程测试
nohup npm run monitor > logs/test.log 2>&1 &
```

### 6.2 日志监控
```bash
# 创建日志目录
mkdir -p logs

# 实时查看积分监控日志
tail -f logs/monitor.log

# 实时查看每日重置日志
tail -f logs/daily-reset.log

# 查看所有日志文件
ls -la logs/
```

### 6.3 管理命令
```bash
# 查看积分监控进程
ps aux | grep "node.*monitor"

# 停止积分监控进程
pkill -f "node.*monitor"

# 手动启动积分监控
nohup npm run monitor > logs/monitor.log 2>&1 &

# 手动执行每日重置
npm run daily-reset

# 单次测试
npm run test
```

---

## 🔧 常见问题排除

### 问题1: Git克隆失败
```bash
# 如果提示权限问题，使用HTTPS方式
git clone https://github.com/YOUR-USERNAME/CC-AutoRefresh.git

# 如果网络问题，配置代理（如果有）
git config --global http.proxy http://proxy-server:port
```

### 问题2: Node.js安装失败
```bash
# 使用snap安装（备用方案）
sudo snap install node --classic

# 或者使用NVM安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 问题3: Playwright浏览器依赖问题
```bash
# 安装额外依赖
sudo apt-get install -y \
    libnss3 libnspr4 libatk-bridge2.0-0 libdrm2 \
    libgtk-3-0 libgbm1 libasound2

# 重新安装Playwright浏览器
npx playwright install chromium --with-deps
```

### 问题4: 权限问题
```bash
# 修复脚本权限
chmod +x scripts/*.sh

# 修复配置文件权限
chmod 600 config.json

# 修复日志目录权限
mkdir -p logs
chmod 755 logs/
```

---

## 🎯 成功部署验证清单

- [ ] GitHub仓库创建成功并推送代码
- [ ] XShell成功连接到Ubuntu服务器
- [ ] 项目成功克隆到服务器
- [ ] Node.js和npm安装成功
- [ ] 项目依赖安装成功
- [ ] Playwright浏览器安装成功
- [ ] config.json配置完成
- [ ] 单次测试运行成功，显示积分信息
- [ ] cron任务设置成功
- [ ] 积分监控进程运行正常
- [ ] 日志文件正常生成

完成以上清单，你的智能积分管理系统就成功部署了！

---

## 📞 技术支持

如果遇到问题，可以：

1. 查看项目日志：`tail -f logs/*.log`
2. 检查cron任务：`crontab -l`
3. 验证进程状态：`ps aux | grep node`
4. 重启服务：`pkill -f node && nohup npm run monitor &`

**部署完成后，系统将自动：**
- 每10分钟监控积分状态
- 积分不足500时立即重置
- 每天23:55强制重置
- 失败时发送邮件报警