# CC-AutoRefresh 积分自动重置工具

每天北京时间 23:55 自动点击"重置积分至上限"按钮，失败时发送邮件报警。

## 功能特性

### 🔄 **双重保障机制**
- ✅ **积分监控**: 每10分钟检查，积分 < 500 时立即重置
- ✅ **定时重置**: 每日23:55强制重置（无论积分多少）
- ✅ **独立运行**: 两个任务分离，互不影响

### 📊 **智能积分管理**
- ✅ **实时监控**: 自动显示当前积分 (18,763/20,000 89%)
- ✅ **阈值触发**: 积分不足500自动补充
- ✅ **每日保障**: 23:55强制重置确保次日可用

### 🖥️ **技术特性**
- ✅ **云服务器友好**: 无头浏览器模式，资源占用极低
- ✅ **多框架支持**: Playwright/Headless/Selenium/Puppeteer  
- ✅ **自动登录**: NextAuth认证系统支持
- ✅ **弹窗处理**: 自动关闭初始通知
- ✅ **强制重置**: 可绕过按钮禁用状态
- ✅ **邮件报警**: 失败时自动发送（包含积分信息）
- ✅ **跨平台**: Linux/Windows 完全兼容

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置设置

首次运行会自动生成 `config.json`，请编辑其中的配置：

```json
{
  "automation": {
    "framework": "playwright",
    "url": "https://your-website.com",
    "timeout": 60000,
    "headless": true
  },
  "email": {
    "enabled": true,
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "user": "your-email@gmail.com",
      "password": "your-app-password"
    },
    "from": "your-email@gmail.com",
    "to": "alert@example.com"
  }
}
```

### 3. 测试运行

```bash
# 测试模式（单次检查，显示积分）
npm run test

## 运行模式

### 积分监控模式（推荐）
```bash
# 持续监控积分，每10分钟检查，低于500自动重置
node src/main.js --mode=monitor

# 测试监控模式（30秒间隔，运行2分钟）
node test-monitor-mode.js
```

### 每日定时重置模式
```bash
# 强制重置积分（无论当前积分多少）
node src/main.js --mode=daily-reset
```

### 向后兼容模式
```bash
# 原有的混合模式（不推荐，建议使用上面的分离模式）
npm start
```

### 其他测试
```bash
# 测试低积分触发重置
node test-low-points.js

# 1分钟间隔演示
node demo-periodic.js
```

## 部署指南

### Ubuntu 云服务器部署 (推荐)

**自动化一键部署：**
```bash
# 1. 上传项目文件到服务器
scp -r CC-AutoRefresh user@your-server:~/cc-autorefresh

# 2. 登录服务器并运行部署脚本
ssh user@your-server
cd ~/cc-autorefresh
chmod +x scripts/ubuntu_setup.sh
./scripts/ubuntu_setup.sh
```

**部署要求：**
- Ubuntu 18.04+ / Debian 10+
- 至少 1GB 内存
- Node.js 18+（脚本自动安装）

### Ubuntu/Linux 手动部署

**推荐：分离式双任务部署**
```bash
chmod +x scripts/setup_dual_cron.sh
./scripts/setup_dual_cron.sh
```

**传统：单一任务部署**
```bash
chmod +x scripts/setup_cron.sh
./scripts/setup_cron.sh
```

2. **配置邮件服务 (可选)：**
   ```bash
   chmod +x scripts/msmtp_setup.sh
   ./scripts/msmtp_setup.sh
   ```

### Windows 部署

1. **以管理员身份运行 PowerShell**

2. **设置任务计划程序：**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   .\scripts\setup_task_scheduler.ps1
   ```

## 按钮识别逻辑

### 定位策略
1. **首选**: 按钮文本包含 "点击重置积分至上限" 等关键词
2. **兜底**: CSS类名包含 `bg-teal-600`, `hover:bg-teal-700`, `text-white`

### 状态判断
- **需要点击**: 文本包含 `(1/1)` 或 "今日可用"
- **无需点击**: 文本包含 `(0/1)`, "已重置", "今日次数已用完"

## 文件结构

```
CC-AutoRefresh/
├── src/
│   ├── main.js              # 主程序
│   ├── email.js             # 邮件功能
│   └── frameworks/          # 自动化框架
│       ├── playwright.js
│       ├── selenium.js
│       └── puppeteer.js
├── scripts/
│   ├── run_once.sh          # Linux启动脚本
│   ├── run_once.bat         # Windows启动脚本
│   ├── setup_cron.sh        # Linux定时任务设置
│   ├── setup_task_scheduler.ps1  # Windows任务设置
│   └── msmtp_setup.sh       # Linux邮件配置
├── logs/                    # 日志目录
├── config.json              # 配置文件
└── package.json
```

## 日志查看

- **运行日志**: `logs/autorefresh.log`
- **错误日志**: `logs/error.log`  
- **cron日志**: `logs/cron.out`

## 常见问题

### 1. 按钮找不到？
- 检查网站URL是否正确
- 调整按钮识别的关键词
- 使用无头模式 `headless: false` 观察页面

### 2. 邮件发送失败？
- Gmail: 开启两步验证，使用应用专用密码
- QQ邮箱: 开启SMTP服务，使用授权码
- 企业邮箱: 确认SMTP配置正确

### 3. 定时任务不执行？
- Linux: 检查cron服务状态 `sudo systemctl status cron`
- Windows: 确保计算机在执行时间开机
- 检查时区设置

## 手动管理

### Linux
```bash
# 查看cron任务
crontab -l

# 手动执行
./scripts/run_once.sh

# 查看日志
tail -f logs/autorefresh.log
```

### Windows
```powershell
# 查看任务
Get-ScheduledTask -TaskName "CC-AutoRefresh"

# 手动执行
Start-ScheduledTask -TaskName "CC-AutoRefresh"

# 删除任务
Unregister-ScheduledTask -TaskName "CC-AutoRefresh"
```