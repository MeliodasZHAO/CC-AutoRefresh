const nodemailer = require('nodemailer');

async function sendEmailAlert(emailConfig, message) {
  try {
    console.log('准备发送报警邮件...');
    
    // 创建邮件传输器
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      auth: {
        user: emailConfig.smtp.user,
        pass: emailConfig.smtp.password
      }
    });
    
    // 邮件内容
    const mailOptions = {
      from: emailConfig.from,
      to: emailConfig.to,
      subject: emailConfig.subject,
      text: `${message}\n\n时间: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}\n系统: ${process.platform}`,
      html: `
        <h3>积分重置自动化报警</h3>
        <p><strong>错误信息:</strong> ${message}</p>
        <p><strong>时间:</strong> ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}</p>
        <p><strong>系统:</strong> ${process.platform}</p>
        <hr>
        <p><em>此邮件由自动化系统发送，请勿回复。</em></p>
      `
    };
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    console.log('报警邮件发送成功:', info.messageId);
    
    return true;
  } catch (error) {
    console.error('发送报警邮件失败:', error.message);
    return false;
  }
}

// 邮件配置验证
function validateEmailConfig(config) {
  const required = ['smtp.host', 'smtp.port', 'smtp.user', 'smtp.password', 'from', 'to'];
  
  for (const path of required) {
    const keys = path.split('.');
    let value = config;
    
    for (const key of keys) {
      value = value && value[key];
    }
    
    if (!value) {
      throw new Error(`邮件配置缺少必需字段: ${path}`);
    }
  }
  
  return true;
}

module.exports = {
  sendEmailAlert,
  validateEmailConfig
};