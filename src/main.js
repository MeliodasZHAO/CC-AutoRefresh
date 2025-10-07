#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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

  // 检查并强制终止所有旧实例
  checkAndReplaceOldInstance() {
    console.log('检查现有实例...');

    // 先清理锁文件
    if (fs.existsSync(LOCK_FILE)) {
      try {
        fs.unlinkSync(LOCK_FILE);
        console.log('锁文件已清理');
      } catch (e) {
        // 忽略删除错误
      }
    }

    // 强制终止所有main.js实例
    try {
      const result = execSync('pgrep -f "node.*main.js"', { encoding: 'utf8' }).trim();
      if (result) {
        const pids = result.split('\n').filter(pid => pid && parseInt(pid) !== process.pid);
        if (pids.length > 0) {
          console.log(`发现${pids.length}个旧实例，正在终止...`);
          for (const pid of pids) {
            try {
              console.log(`终止实例 PID: ${pid}`);
              process.kill(parseInt(pid), 'SIGKILL');
            } catch (e) {
              // 忽略终止错误
            }
          }
          console.log('所有旧实例已终止');
        }
      }
    } catch (e) {
      // 没有其他实例或命令失败
      console.log('未发现其他实例');
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

    console.log('======================================');
    console.log('🚀 CC-AutoRefresh 启动 - 定时重置模式');
    console.log(`📅 启动时间: ${new Date().toLocaleString()}`);
    console.log(`🆔 进程 PID: ${process.pid}`);
    console.log(`⏰ 执行时间: 每天 ${this.RESET_HOUR}:${this.RESET_MINUTE.toString().padStart(2, '0')}`);
    console.log('======================================');

    while (true) {
      try {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

        console.log(`[${new Date().toLocaleString()}] 检查循环 - 当前时间 ${hour}:${minute.toString().padStart(2, '0')}`);

        // 只在设定时间执行（默认23:58-23:59）
        if (hour === this.RESET_HOUR && minute >= this.RESET_MINUTE && minute <= this.RESET_MINUTE + 1) {
          console.log(`[${new Date().toLocaleString()}] 时间匹配! 开始执行重置操作...`);

          try {
            this.framework = new (require('./frameworks/headless'))(this.config);
            const result = await this.framework.execute();

            if (result.success) {
              console.log(`[${new Date().toLocaleString()}] ✅ 重置操作完成`);
            } else {
              console.log(`[${new Date().toLocaleString()}] ❌ 重置操作失败: ${result.error || '未知错误'}`);

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

          // 等待到第二天,使用分段等待避免长时间睡眠
          const waitTime = this.getWaitTimeToNextDay();
          const waitHours = Math.round(waitTime/1000/60/60 * 10) / 10;
          console.log(`[${new Date().toLocaleString()}] 等待到明天${this.RESET_HOUR}:${this.RESET_MINUTE.toString().padStart(2, '0')}，约${waitHours}小时`);

          // 分段等待,每30分钟检查一次,避免长睡眠问题
          let remainingWait = waitTime;
          while (remainingWait > 0) {
            const sleepTime = Math.min(remainingWait, 30 * 60 * 1000);
            await this.sleep(sleepTime);
            remainingWait -= sleepTime;
            if (remainingWait > 0) {
              console.log(`[${new Date().toLocaleString()}] 继续等待,剩余约${Math.round(remainingWait/1000/60/60 * 10) / 10}小时`);
            }
          }

        } else {
          // 等待到设定时间
          const waitTime = this.getWaitTimeToResetTime();
          const waitMinutes = Math.round(waitTime / 1000 / 60);
          const waitHours = Math.round(waitTime / 1000 / 60 / 60 * 10) / 10;

          // 距离执行时间越近,检查越频繁
          let checkInterval;
          if (waitMinutes < 5) {
            checkInterval = 30 * 1000;  // 30秒检查一次
          } else if (waitMinutes < 30) {
            checkInterval = 60 * 1000;  // 1分钟检查一次
          } else {
            checkInterval = Math.min(waitTime, 30 * 60 * 1000); // 最多30分钟
          }

          console.log(`[${new Date().toLocaleString()}] 等待到${this.RESET_HOUR}:${this.RESET_MINUTE.toString().padStart(2, '0')}，还需${waitHours}小时 (${waitMinutes}分钟)，下次检查间隔${Math.round(checkInterval/1000)}秒`);

          await this.sleep(checkInterval);
          console.log(`[${new Date().toLocaleString()}] 睡眠结束,继续检查...`);
        }

      } catch (error) {
        console.log(`[${new Date().toLocaleString()}] 程序异常: ${error.message}`);
        console.error(error);
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