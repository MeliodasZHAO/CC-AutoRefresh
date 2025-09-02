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
    console.log(`程序启动: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
    console.log(`运行模式: 智能等待，仅在23:55-23:59触发重置`);
    console.log('注意: 已关闭定期检查，大幅降低服务器资源消耗');
    console.log('');
    
    while (true) {
      const bjTime = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Shanghai'}));
      const hour = bjTime.getHours();
      const minute = bjTime.getMinutes();
      
      console.log(`当前时间: ${bjTime.toLocaleString('zh-CN')}`);
      
      // 只在23:55-23:59时间窗口内执行检查
      if (hour === 23 && minute >= 55) {
        console.log('🔥 进入重置时间窗口，开始执行重置操作...');
        
        try {
          await this.initFramework();
          const result = await this.framework.execute();
          
          if (result.success) {
            if (result.resetExecuted) {
              console.log('✅ 定时重置操作完成');
              if (result.pointsInfo) {
                console.log(`积分状态: ${result.pointsInfo.formatted}`);
              }
            } else {
              console.log('✓ 无需重置操作');
              if (result.pointsInfo) {
                console.log(`积分状态: ${result.pointsInfo.formatted}`);
              }
            }
          } else {
            console.log('❌ 重置操作失败');
            
            // 发送邮件报警
            if (this.config.email.enabled) {
              const alertMessage = result.pointsInfo 
                ? `定时重置失败，当前积分: ${result.pointsInfo.formatted}`
                : '定时重置失败，请检查系统状态';
              
              try {
                await sendEmailAlert(this.config.email, alertMessage);
                console.log('已发送邮件报警');
              } catch (emailError) {
                console.error('邮件发送失败:', emailError.message);
              }
            }
          }
          
        } catch (error) {
          console.error('重置操作异常:', error.message);
          
          // 发送邮件报警
          if (this.config.email.enabled) {
            try {
              await sendEmailAlert(this.config.email, `定时重置异常: ${error.message}`);
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
        
        // 重置完成后等待到第二天
        console.log('重置操作完成，等待到明天23:55...');
        const waitTime = this.calculateWaitTimeToNextDay();
        console.log(`等待时间: ${Math.round(waitTime / 1000 / 60 / 60 * 100) / 100} 小时`);
        await this.sleep(waitTime);
        
      } else {
        // 非重置时间，计算等待时间到23:55
        const waitTime = this.calculateWaitTimeToResetWindow();
        const waitHours = Math.round(waitTime / 1000 / 60 / 60 * 100) / 100;
        console.log(`等待到重置时间 23:55，还需等待 ${waitHours} 小时`);
        console.log('程序进入休眠模式，降低服务器负载...\n');
        
        await this.sleep(waitTime);
      }
    }
  }

  calculateWaitTimeToResetWindow() {
    const bjTime = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Shanghai'}));
    const now = bjTime.getTime();
    
    // 计算今天23:55的时间
    const today2355 = new Date(bjTime);
    today2355.setHours(23, 55, 0, 0);
    
    if (now < today2355.getTime()) {
      // 还没到今天23:55，等待到今天23:55
      return today2355.getTime() - now;
    } else {
      // 已经过了今天23:55，等待到明天23:55
      const tomorrow2355 = new Date(today2355);
      tomorrow2355.setDate(tomorrow2355.getDate() + 1);
      return tomorrow2355.getTime() - now;
    }
  }
  
  calculateWaitTimeToNextDay() {
    const bjTime = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Shanghai'}));
    
    // 计算明天23:55的时间
    const tomorrow2355 = new Date(bjTime);
    tomorrow2355.setDate(tomorrow2355.getDate() + 1);
    tomorrow2355.setHours(23, 55, 0, 0);
    
    return tomorrow2355.getTime() - bjTime.getTime();
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