#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { sendEmailAlert } = require('./email');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

// 默认配置
const DEFAULT_CONFIG = {
  "automation": {
    "framework": "playwright", // playwright, selenium, puppeteer
    "url": "https://example.com", // 替换为实际网站URL
    "timeout": 60000, // 1分钟超时
    "headless": true
  },
  "email": {
    "enabled": true,
    "smtp": {
      "host": "smtp.163.com",
      "port": 587,
      "secure": false,
      "user": "19271134048@163.com",
      "password": "ZHAOzilong1101"
    },
    "from": "19271134048@163.com",
    "to": "695325137@qq.com",
    "subject": "报警：积分重置失败"
  },
  "button": {
    "textKeywords": ["点击重置积分至上限", "重置积分"],
    "cssClasses": ["bg-teal-600", "hover:bg-teal-700", "text-white"],
    "successIndicators": ["(0/1)", "已重置", "重置成功"],
    "availableIndicators": ["(1/1)", "今日可用", "可重置"]
  }
};

class AutoRefresh {
  constructor() {
    this.config = this.loadConfig();
    this.isTestMode = process.argv.includes('--test');
    this.framework = null;
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return { ...DEFAULT_CONFIG, ...config };
      } else {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
        console.log(`配置文件已创建: ${CONFIG_FILE}`);
        console.log('请编辑配置文件后重新运行');
        process.exit(0);
      }
    } catch (error) {
      console.error('配置文件加载失败:', error.message);
      return DEFAULT_CONFIG;
    }
  }

  async initFramework() {
    const frameworkName = this.config.automation.framework;
    
    try {
      switch (frameworkName) {
        case 'playwright':
          this.framework = new (require('./frameworks/playwright'))(this.config);
          break;
        case 'selenium':
          this.framework = new (require('./frameworks/selenium'))(this.config);
          break;
        case 'puppeteer':
          this.framework = new (require('./frameworks/puppeteer'))(this.config);
          break;
        case 'http':
          this.framework = new (require('./frameworks/http'))(this.config);
          break;
        case 'headless':
          this.framework = new (require('./frameworks/headless'))(this.config);
          break;
        default:
          throw new Error(`不支持的框架: ${frameworkName}`);
      }
      
      console.log(`使用框架: ${frameworkName}`);
    } catch (error) {
      console.error(`框架初始化失败: ${error.message}`);
      throw error;
    }
  }

  async run() {
    const startTime = new Date();
    console.log(`开始执行自动刷新任务: ${startTime.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
    
    try {
      if (this.isTestMode) {
        console.log('测试模式：执行一次检查');
        await this.performSingleCheck();
      } else {
        // 检查运行模式
        const mode = process.argv.find(arg => arg.startsWith('--mode='));
        if (mode) {
          const modeValue = mode.split('=')[1];
          if (modeValue === 'monitor') {
            await this.startPointsMonitoring();
          } else if (modeValue === 'daily-reset') {
            await this.performDailyReset();
          } else {
            console.log('未知模式，启动默认定期检查');
            await this.startPeriodicCheck();
          }
        } else {
          // 默认模式：启动定期检查（向后兼容）
          await this.startPeriodicCheck();
        }
      }
      
    } catch (error) {
      console.error('执行错误:', error.message);
      if (this.config.email.enabled && !this.isTestMode) {
        await sendEmailAlert(this.config.email, `系统执行异常: ${error.message}`);
      } else {
        console.log(`报警：系统执行异常: ${error.message}`);
      }
    } finally {
      if (this.framework && this.framework.cleanup) {
        await this.framework.cleanup();
      }
      const endTime = new Date();
      const duration = (endTime - startTime) / 1000;
      console.log(`任务结束: ${endTime.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}, 耗时: ${duration}秒`);
    }
  }

  async performSingleCheck() {
    await this.initFramework();
    const result = await this.framework.execute();
    
    // 处理不同的返回格式
    let success = false;
    let pointsInfo = null;
    
    if (typeof result === 'boolean') {
      success = result;
    } else if (result && typeof result === 'object') {
      success = result.success;
      pointsInfo = result.pointsInfo;
    }
    
    if (success) {
      console.log('任务执行成功');
      if (pointsInfo) {
        console.log(`✨ 积分状态: ${pointsInfo.formatted} (${pointsInfo.percentage}%)`);
      }
    } else {
      console.log('任务执行失败，发送报警邮件');
      const alertMessage = pointsInfo 
        ? `积分重置失败，当前积分: ${pointsInfo.formatted}，请检查系统状态`
        : '积分重置失败，请检查系统状态';
        
      if (this.config.email.enabled && !this.isTestMode) {
        await sendEmailAlert(this.config.email, alertMessage);
      } else {
        console.log('报警：邮件功能未启用或处于测试模式');
      }
    }
    
    return { success, pointsInfo };
  }

  async startPeriodicCheck() {
    console.log(`🔄 启动定期检查模式，间隔: ${this.config.automation.checkInterval / 1000 / 60} 分钟`);
    console.log(`⚡ 重置条件: 积分 < ${this.config.automation.lowPointsThreshold} 或 时间到达23:55`);
    
    while (true) {
      const currentTime = new Date();
      const bjTime = new Date(currentTime.toLocaleString('en-US', {timeZone: 'Asia/Shanghai'}));
      
      console.log(`\n⏰ ${bjTime.toLocaleString('zh-CN')} - 执行定期检查...`);
      
      try {
        await this.initFramework();
        
        // 只获取积分信息，不执行重置
        const result = await this.framework.checkPointsOnly();
        
        if (result && result.pointsInfo) {
          const points = result.pointsInfo;
          console.log(`📊 当前积分: ${points.formatted} (${points.percentage}%)`);
          
          // 检查是否需要重置
          const needsReset = this.shouldReset(points.current, bjTime);
          
          if (needsReset.should) {
            console.log(`🔥 触发重置条件: ${needsReset.reason}`);
            console.log('执行重置操作...');
            
            const resetResult = await this.framework.execute();
            if (resetResult && resetResult.success) {
              console.log('✅ 重置操作成功');
              if (resetResult.pointsInfo) {
                console.log(`📊 重置后积分: ${resetResult.pointsInfo.formatted}`);
              }
            } else {
              console.log('❌ 重置操作失败');
              if (this.config.email.enabled) {
                await sendEmailAlert(this.config.email, 
                  `重置操作失败 (${needsReset.reason})，当前积分: ${points.formatted}`);
              }
            }
          } else {
            console.log(`✓ 无需重置 - ${needsReset.reason}`);
          }
        } else {
          console.log('❌ 获取积分信息失败');
        }
        
      } catch (error) {
        console.error('定期检查出错:', error.message);
      } finally {
        if (this.framework && this.framework.cleanup) {
          await this.framework.cleanup();
        }
      }
      
      // 等待下一次检查
      console.log(`💤 等待 ${this.config.automation.checkInterval / 1000 / 60} 分钟后进行下一次检查...`);
      await this.sleep(this.config.automation.checkInterval);
    }
  }

  shouldReset(currentPoints, bjTime) {
    const hour = bjTime.getHours();
    const minute = bjTime.getMinutes();
    
    // 条件1: 积分小于阈值
    if (currentPoints < this.config.automation.lowPointsThreshold) {
      return {
        should: true,
        reason: `积分不足 (${currentPoints} < ${this.config.automation.lowPointsThreshold})`
      };
    }
    
    // 条件2: 北京时间 23:55
    if (hour === 23 && minute >= 55) {
      return {
        should: true,
        reason: `时间到达 23:55 (每日重置时间)`
      };
    }
    
    return {
      should: false,
      reason: `积分充足 (${currentPoints}) 且非重置时间 (${hour}:${minute.toString().padStart(2, '0')})`
    };
  }

  async startPointsMonitoring() {
    console.log('🔍 启动积分监控模式');
    console.log(`📊 监控间隔: ${this.config.automation.checkInterval / 1000 / 60} 分钟`);
    console.log(`⚡ 重置阈值: 积分 < ${this.config.automation.lowPointsThreshold}`);
    
    while (true) {
      const currentTime = new Date();
      const bjTime = new Date(currentTime.toLocaleString('en-US', {timeZone: 'Asia/Shanghai'}));
      
      console.log(`\n⏰ ${bjTime.toLocaleString('zh-CN')} - 积分监控检查...`);
      
      try {
        await this.initFramework();
        
        // 只获取积分信息
        const result = await this.framework.checkPointsOnly();
        
        if (result && result.pointsInfo) {
          const points = result.pointsInfo;
          console.log(`📊 当前积分: ${points.formatted} (${points.percentage}%)`);
          
          // 只检查积分条件
          if (points.current < this.config.automation.lowPointsThreshold) {
            console.log(`🔥 积分不足，触发重置 (${points.current} < ${this.config.automation.lowPointsThreshold})`);
            
            const resetResult = await this.framework.execute();
            if (resetResult && resetResult.success) {
              console.log('✅ 积分重置成功');
              if (resetResult.pointsInfo) {
                console.log(`📊 重置后积分: ${resetResult.pointsInfo.formatted}`);
              }
            } else {
              console.log('❌ 积分重置失败');
              if (this.config.email.enabled) {
                await sendEmailAlert(this.config.email, 
                  `积分监控：重置失败，当前积分: ${points.formatted}`);
              }
            }
          } else {
            console.log(`✓ 积分充足，无需重置 (${points.current})`);
          }
        } else {
          console.log('❌ 获取积分信息失败');
        }
        
      } catch (error) {
        console.error('积分监控出错:', error.message);
      } finally {
        if (this.framework && this.framework.cleanup) {
          await this.framework.cleanup();
        }
      }
      
      console.log(`💤 等待 ${this.config.automation.checkInterval / 1000 / 60} 分钟后继续监控...`);
      await this.sleep(this.config.automation.checkInterval);
    }
  }

  async performDailyReset() {
    console.log('⏰ 执行每日定时重置');
    console.log(`🕚 当前时间: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
    
    try {
      await this.initFramework();
      
      // 获取当前积分状态
      const result = await this.framework.checkPointsOnly();
      if (result && result.pointsInfo) {
        console.log(`📊 重置前积分: ${result.pointsInfo.formatted} (${result.pointsInfo.percentage}%)`);
      }
      
      // 强制执行重置（无论积分多少）
      console.log('🔄 执行每日强制重置...');
      const resetResult = await this.framework.executeForceReset();
      
      if (resetResult && resetResult.success) {
        console.log('✅ 每日重置成功');
        if (resetResult.pointsInfo) {
          console.log(`📊 重置后积分: ${resetResult.pointsInfo.formatted}`);
        }
        
        if (this.config.email.enabled) {
          await sendEmailAlert(this.config.email, 
            `每日重置成功 - ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
        }
      } else {
        console.log('❌ 每日重置失败');
        if (this.config.email.enabled) {
          await sendEmailAlert(this.config.email, 
            `每日重置失败 - ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
        }
      }
      
    } catch (error) {
      console.error('每日重置出错:', error.message);
      if (this.config.email.enabled) {
        await sendEmailAlert(this.config.email, `每日重置异常: ${error.message}`);
      }
    } finally {
      if (this.framework && this.framework.cleanup) {
        await this.framework.cleanup();
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isInTimeWindow() {
    const now = new Date();
    const bjTime = new Date(now.toLocaleString('en-US', {timeZone: 'Asia/Shanghai'}));
    const hour = bjTime.getHours();
    const minute = bjTime.getMinutes();
    
    // 23:55-23:56 窗口
    return (hour === 23 && minute >= 55) || (hour === 23 && minute === 56);
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