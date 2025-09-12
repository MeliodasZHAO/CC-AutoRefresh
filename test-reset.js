#!/usr/bin/env node
/**
 * 测试重置功能脚本 - 立即执行测试
 * 用于调试和验证修复后的功能
 */

const fs = require('fs');
const path = require('path');
const { sendEmailAlert } = require('./src/email');

const CONFIG_FILE = path.join(__dirname, 'config.json');

class TestReset {
  constructor() {
    this.config = this.loadConfig();
    this.framework = null;
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } else {
        console.error('配置文件不存在:', CONFIG_FILE);
        process.exit(1);
      }
    } catch (error) {
      console.error('配置文件加载失败:', error.message);
      process.exit(1);
    }
  }

  async test() {
    console.log('🔥 开始测试重置功能...');
    console.log(`测试时间: ${new Date().toLocaleString()}`);
    console.log('使用无头浏览器框架');
    
    try {
      this.framework = new (require('./src/frameworks/headless'))(this.config);
      const result = await this.framework.execute();
      
      if (result.success) {
        console.log('✅ 重置操作成功！');
      } else {
        console.log(`❌ 重置操作失败: ${result.error || '未知错误'}`);
        
        // 测试邮件发送
        if (this.config.email && this.config.email.enabled) {
          console.log('测试邮件发送...');
          const alertMessage = `测试 - 积分重置失败报警

时间: ${new Date().toLocaleString()}
错误: ${result.error || '未知错误'}

这是一次测试运行。

-- CC-AutoRefresh 自动化系统`;
          
          try {
            await sendEmailAlert(this.config.email, alertMessage);
            console.log('✅ 邮件发送成功');
          } catch (emailError) {
            console.log(`❌ 邮件发送失败: ${emailError.message}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ 测试异常: ${error.message}`);
    } finally {
      if (this.framework && this.framework.cleanup) {
        await this.framework.cleanup();
      }
    }
    
    console.log('测试完成');
  }
}

// 立即执行测试
const test = new TestReset();
test.test().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});