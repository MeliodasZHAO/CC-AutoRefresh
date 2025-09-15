#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { sendEmailAlert } = require('./email');

const CONFIG_FILE = path.join(__dirname, '..', 'config.json');
const LOCK_FILE = path.join(__dirname, '..', '.autorefresh.lock');

class AutoRefresh {
  constructor() {
    this.config = this.loadConfig();
    this.framework = null;

    // ============ 时间配置 ============
    // 修改执行时间只需要改这里的时和分
    this.RESET_HOUR = 23;    // 执行小时 (0-23)
    this.RESET_MINUTE = 58;  // 执行分钟 (0-59)
    // ==================================
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

  // 检查是否已有实例在运行，如果有则终止旧实例
  checkAndReplaceOldInstance() {
    if (fs.existsSync(LOCK_FILE)) {
      try {
        const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
        const oldPid = lockData.pid;

        // 检查旧进程是否还存活
        try {
          process.kill(oldPid, 0); // 不实际杀死进程，只检查是否存在
          console.log(`检测到旧实例正在运行 (PID: ${oldPid})`);

          // 尝试优雅地终止旧进程
          try {
            console.log('正在终止旧实例...');
            process.kill(oldPid, 'SIGTERM');

            // 等待一段时间让旧进程清理
            setTimeout(() => {
              try {
                // 检查是否还存活，如果还存活则强制杀死
                process.kill(oldPid, 0);
                console.log('强制终止旧实例');
                process.kill(oldPid, 'SIGKILL');
              } catch (e) {
                // 进程已经终止
              }
            }, 2000);

            console.log('旧实例已终止，启动新实例');
          } catch (killError) {
            console.log(`终止旧实例失败: ${killError.message}`);
          }
        } catch (e) {
          // 进程不存在，清理旧锁文件
          console.log('清理无效的锁文件');
          fs.unlinkSync(LOCK_FILE);
        }
      } catch (e) {
        // 锁文件损坏，删除重建
        console.log('锁文件损坏，重新创建');
        try {
          fs.unlinkSync(LOCK_FILE);
        } catch (unlinkError) {
          // 忽略删除错误
        }
      }
    }
  }

  // 创建锁文件
  createLock() {
    const lockData = {
      pid: process.pid,
      startTime: new Date().toISOString(),
      version: '1.0'
    };
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));

    // 程序退出时清理锁文件
    const cleanup = () => {
      try {
        if (fs.existsSync(LOCK_FILE)) {
          fs.unlinkSync(LOCK_FILE);
        }
      } catch (e) {
        // 忽略清理错误
      }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });
    process.on('uncaughtException', (error) => {
      console.error('程序异常:', error);
      cleanup();
      process.exit(1);
    });
  }

  async run() {
    // 检查并替换旧实例
    this.checkAndReplaceOldInstance();

    // 等待一下确保旧实例完全退出
    await this.sleep(3000);

    // 创建新的锁文件
    this.createLock();

    console.log('CC-AutoRefresh 启动 - 定时重置模式');
    console.log(`启动时间: ${new Date().toLocaleString()}`);
    console.log(`进程 PID: ${process.pid}`);

    while (true) {
      try {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // 只在设定时间执行（默认23:58-23:59）
        if (hour === this.RESET_HOUR && minute >= this.RESET_MINUTE && minute <= this.RESET_MINUTE + 1) {
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
          console.log(`[${new Date().toLocaleString()}] 等待到明天${this.RESET_HOUR}:${this.RESET_MINUTE.toString().padStart(2, '0')}，约${Math.round(waitTime/1000/60/60)}小时`);
          await this.sleep(Math.min(waitTime, 4 * 60 * 60 * 1000)); // 最多等待4小时
          
        } else {
          // 等待到设定时间
          const waitTime = this.getWaitTimeToResetTime();
          const waitHours = Math.round(waitTime / 1000 / 60 / 60 * 10) / 10;
          console.log(`[${new Date().toLocaleString()}] 等待到${this.RESET_HOUR}:${this.RESET_MINUTE.toString().padStart(2, '0')}，还需${waitHours}小时`);
          
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
    target.setHours(this.RESET_HOUR, this.RESET_MINUTE, 0, 0);

    if (now.getTime() >= target.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
  }
  getWaitTimeToNextDay() {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(this.RESET_HOUR, this.RESET_MINUTE, 0, 0);

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