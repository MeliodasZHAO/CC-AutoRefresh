#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { sendEmailAlert } = require('./email');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

class AutoRefresh {
  constructor() {
    this.config = this.loadConfig();
    this.framework = null;
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return config;
      } else {
        console.error('配置文件不存在:', CONFIG_FILE);
        process.exit(1);
      }
    } catch (error) {
      console.error('配置文件加载失败:', error.message);
      process.exit(1);
    }
  }

  async initFramework() {
    try {
      this.framework = new (require('./frameworks/headless'))(this.config);
      console.log('使用无头浏览器框架');
    } catch (error) {
      console.error('框架初始化失败:', error.message);
      throw error;
    }
  }

  async run() {
    console.log(`开始执行: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
    console.log(`检查间隔: ${this.config.automation.checkInterval / 1000 / 60} 分钟`);
    console.log(`重置条件: 积分 < 500 或 时间到达23:58`);
    console.log('');
    
    while (true) {
      const bjTime = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Shanghai'}));
      console.log(`检查时间: ${bjTime.toLocaleString('zh-CN')}`);
      
      try {
        await this.initFramework();
        const result = await this.framework.execute();
        
        if (result.success) {
          if (result.resetExecuted) {
            console.log('✅ 重置操作完成');
            if (result.pointsInfo) {
              console.log(`积分状态: ${result.pointsInfo.formatted}`);
            }
          } else {
            console.log('✓ 无需操作');
            if (result.pointsInfo) {
              console.log(`积分状态: ${result.pointsInfo.formatted}`);
            }
          }
        } else {
          console.log('❌ 操作失败');
          
          // 发送邮件报警
          if (this.config.email.enabled) {
            const alertMessage = result.pointsInfo 
              ? `重置失败，当前积分: ${result.pointsInfo.formatted}`
              : '重置失败，请检查系统状态';
            
            try {
              await sendEmailAlert(this.config.email, alertMessage);
              console.log('已发送邮件报警');
            } catch (emailError) {
              console.error('邮件发送失败:', emailError.message);
            }
          }
        }
        
      } catch (error) {
        console.error('执行异常:', error.message);
        
        // 发送邮件报警
        if (this.config.email.enabled) {
          try {
            await sendEmailAlert(this.config.email, `系统异常: ${error.message}`);
            console.log('已发送异常报警邮件');
          } catch (emailError) {
            console.error('邮件发送失败:', emailError.message);
          }
        }
      } finally {
        if (this.framework && this.framework.cleanup) {
          await this.framework.cleanup();
        }
      }
      
      console.log(`等待 ${this.config.automation.checkInterval / 1000 / 60} 分钟后继续...\n`);
      await this.sleep(this.config.automation.checkInterval);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主程序入口
if (require.main === module) {
  const app = new AutoRefresh();
  app.run().catch(error => {
    console.error('程序异常退出:', error);
    process.exit(1);
  });
}

module.exports = AutoRefresh;