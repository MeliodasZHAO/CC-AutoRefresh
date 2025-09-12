const nodemailer = require('nodemailer');

async function sendEmailAlert(emailConfig, message) {
  try {
    // 创建SMTP传输器
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      auth: {
        user: emailConfig.smtp.user,
        pass: emailConfig.smtp.password
      },
      authMethod: emailConfig.smtp.authMethod || 'PLAIN'
    });

    // 发送邮件
    const mailOptions = {
      from: emailConfig.from,
      to: emailConfig.to, 
      subject: emailConfig.subject,
      text: message,
      html: message.replace(/\n/g, '<br>')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('邮件发送成功:', info.messageId);
    return true;

  } catch (error) {
    console.log('发送报警邮件失败:', error.message);
    return false;
  }
}

module.exports = {
  sendEmailAlert
};