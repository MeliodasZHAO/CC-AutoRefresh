#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { sendEmailAlert } = require('./email');

const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

class AutoRefresh {
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

  async run() {
    console.log('CC-AutoRefresh 启动 - 定时重置模式');
    console.log(`启动时间: ${new Date().toLocaleString()}`);
    
    while (true) {
      try {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // 只在23:58-23:59执行
        if (hour === 23 && minute >= 58 && minute <= 59) {
          console.log(`[${new Date().toLocaleString()}] 开始执行重置操作...`);
          
          try {
            this.framework = new (require('./frameworks/headless'))(this.config);
            const result = await this.framework.execute();
            
            if (result.success) {
              console.log(`[${new Date().toLocaleString()}] 重置操作完成`);
            } else {
              console.log(`[${new Date().toLocaleString()}] 重置操作失败: ${result.error || '未知错误'}`);
              
              // 发送报警邮件
              if (this.config.email && this.config.email.enabled) {
                console.log('准备发送报警邮件...');
                const alertMessage = `积分重置失败报警

时间: ${new Date().toLocaleString()}
错误: ${result.error || '未知错误'}

系统将在明天继续尝试。

-- CC-AutoRefresh 自动化系统`;
                
                try {
                  await sendEmailAlert(this.config.email, alertMessage);
                  console.log('已发送邮件报警');
                } catch (emailError) {
                  console.log(`邮件发送失败: ${emailError.message}`);
                }
              }
            }
            
          } catch (error) {
            console.log(`[${new Date().toLocaleString()}] 重置操作异常: ${error.message}`);
          } finally {
            if (this.framework && this.framework.cleanup) {
              await this.framework.cleanup();
            }
          }
          
          // 等待到第二天
          const waitTime = this.getWaitTimeToNextDay();
          console.log(`[${new Date().toLocaleString()}] 等待到明天23:58，约${Math.round(waitTime/1000/60/60)}小时`);
          await this.sleep(Math.min(waitTime, 4 * 60 * 60 * 1000)); // 最多等待4小时
          
        } else {
          // 等待到23:58
          const waitTime = this.getWaitTimeToResetTime();
          const waitHours = Math.round(waitTime / 1000 / 60 / 60 * 10) / 10;
          console.log(`[${new Date().toLocaleString()}] 等待到23:58，还需${waitHours}小时`);
          
          await this.sleep(Math.min(waitTime, 2 * 60 * 60 * 1000)); // 最多等待2小时
        }
        
      } catch (error) {
        console.log(`[${new Date().toLocaleString()}] 程序异常: ${error.message}`);
        await this.sleep(60 * 1000); // 等待1分钟
      }
    }
  }

  getWaitTimeToResetTime() {
    const now = new Date();
    const target = new Date();
    target.setHours(23, 58, 0, 0);
    
    if (now.getTime() >= target.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    
    return target.getTime() - now.getTime();
  }
  
  getWaitTimeToNextDay() {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 58, 0, 0);
    
    return tomorrow.getTime() - now.getTime();
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