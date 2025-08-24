# 邮件配置指南

## 163邮箱配置步骤

要使用163邮箱发送报警邮件，需要以下设置：

### 1. 开启客户端授权码

1. 登录 [163邮箱](https://mail.163.com)
2. 点击"设置" → "POP3/SMTP/IMAP"
3. 开启"POP3/SMTP服务"或"IMAP/SMTP服务"
4. 按提示发送短信开启服务
5. 设置"客户端授权码"（不是登录密码）

### 2. 修改配置文件

将 `config.json` 中的邮件配置修改为：

```json
"email": {
  "enabled": true,
  "smtp": {
    "host": "smtp.163.com",
    "port": 587,
    "secure": false,
    "user": "19271134048@163.com",
    "password": "你的授权码"  // 不是登录密码！
  },
  "from": "19271134048@163.com",
  "to": "695325137@qq.com",
  "subject": "报警：积分重置失败"
}
```

### 3. 测试邮件发送

```bash
node test-email.js
```

## 常见问题

### 1. "Invalid login: 550 User has no permission"
- 需要开启SMTP服务并设置授权码
- 使用授权码而非登录密码

### 2. "Unexpected socket close"
- 网络连接问题
- 检查防火墙设置

### 3. 其他SMTP服务器配置

#### QQ邮箱
```json
{
  "host": "smtp.qq.com",
  "port": 587,
  "secure": false,
  "user": "your-qq@qq.com",
  "password": "你的授权码"
}
```

#### Gmail
```json
{
  "host": "smtp.gmail.com", 
  "port": 587,
  "secure": false,
  "user": "your-email@gmail.com",
  "password": "你的应用专用密码"
}
```

## 当前测试状态

❌ **邮件功能**: 需要163邮箱授权码
✅ **自动化功能**: Playwright正常工作，能打开浏览器并查找按钮

## 下一步

1. 在163邮箱中设置授权码
2. 替换config.json中的密码字段
3. 运行 `node test-email.js` 验证
4. 配置实际的网站URL进行完整测试