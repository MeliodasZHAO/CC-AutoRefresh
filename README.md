# CC-AutoRefresh - Ubuntu服务器版

Claude Code积分自动重置工具，专为Ubuntu服务器优化。

## 功能

- 每天23:55-23:59自动执行积分重置操作
- 无头浏览器运行，适合服务器环境
- 简化代码，稳定可靠

## 部署步骤

### 1. 环境要求
```bash
# Ubuntu 20.04/22.04
# Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. 安装依赖
```bash
npm install
npx playwright install chromium
```

### 3. 配置
```bash
cp config.example.json config.json
nano config.json
```

编辑配置文件，填写你的登录信息：
```json
{
  "login": {
    "loginUrl": "https://www.claudecode-cn.com/login",
    "credentials": {
      "username": "your-email@example.com",
      "password": "your-password"
    }
  },
  "automation": {
    "url": "https://www.claudecode-cn.com/dashboard"
  }
}
```

### 4. 运行
```bash
# 后台运行
nohup npm start > app.log 2>&1 &

# 或使用screen
screen -S cc-autorefresh
npm start
# Ctrl+A+D 分离会话
```

### 5. 查看日志
```bash
tail -f app.log
# 或
screen -r cc-autorefresh
```

## 注意事项

- 确保服务器时区正确设置
- 程序会在23:55-23:59时间窗口内执行重置
- 建议使用screen或systemd服务管理
- 网络不稳定时会自动重试