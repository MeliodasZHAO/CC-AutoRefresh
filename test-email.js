#!/usr/bin/env node

const { sendEmailAlert } = require('./src/email');

const fs = require('fs');
const path = require('path');

// 从配置文件读取邮箱配置
const configFile = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const emailConfig = {
  ...config.email,
  subject: "测试：积分重置自动化邮件功能"
};

async function testEmail() {
  console.log('开始测试邮件发送功能...');
  console.log(`发件人: ${emailConfig.from}`);
  console.log(`收件人: ${emailConfig.to}`);
  console.log(`SMTP服务器: ${emailConfig.smtp.host}:${emailConfig.smtp.port}`);
  
  try {
    const success = await sendEmailAlert(emailConfig, '这是一封测试邮件，用于验证积分重置自动化系统的邮件功能是否正常工作。');
    
    if (success) {
      console.log('✅ 邮件发送成功！请检查收件箱: 695325137@qq.com');
      console.log('如果收件箱没有邮件，请检查垃圾箱。');
    } else {
      console.log('❌ 邮件发送失败');
    }
  } catch (error) {
    console.error('❌ 邮件测试失败:', error.message);
  }
}

testEmail();