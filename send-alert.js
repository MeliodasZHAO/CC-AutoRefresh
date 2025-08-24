#!/usr/bin/env node

const { sendEmailAlert } = require('./src/email');
const fs = require('fs');

// 读取配置
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

async function sendTestAlert() {
  console.log('发送测试报警邮件...');
  
  const alertMessage = `系统测试报警

这是一封测试邮件，验证积分重置自动化系统的报警功能。

系统状态：
- 自动化框架：Playwright ✅ 
- 邮件发送：163邮箱 ✅
- 目标邮箱：695325137@qq.com
- 执行时间：北京时间 ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}

系统已就绪，等待每天23:55自动执行！

-- 积分重置自动化系统`;

  try {
    const success = await sendEmailAlert(config.email, alertMessage);
    
    if (success) {
      console.log('✅ 测试报警邮件发送成功！');
      console.log('请检查QQ邮箱 695325137@qq.com');
    } else {
      console.log('❌ 报警邮件发送失败');
    }
  } catch (error) {
    console.error('❌ 发送失败:', error.message);
  }
}

sendTestAlert();