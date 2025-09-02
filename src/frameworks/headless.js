const { chromium } = require('playwright');

class HeadlessAutomation {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
  }

  async execute() {
    try {
      console.log('启动无头浏览器...');
      
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote'
        ]
      });
      
      this.page = await this.browser.newPage();
      await this.page.setViewportSize({ width: 1280, height: 720 });
      this.page.setDefaultTimeout(this.config.automation.timeout);
      
      // 登录
      await this.page.goto(this.config.login.loginUrl);
      await this.page.waitForLoadState('domcontentloaded');
      
      const loginSuccess = await this.performLogin();
      if (!loginSuccess) {
        console.error('登录失败');
        return { success: false };
      }
      
      // 导航到Dashboard
      await this.page.goto(this.config.automation.url);
      await this.page.waitForLoadState('domcontentloaded');
      await this.handlePopups();
      
      // 获取积分信息
      const pointsInfo = await this.getPointsInfo();
      if (pointsInfo) {
        console.log(`当前积分: ${pointsInfo.formatted} (${pointsInfo.percentage}%)`);
      }
      
      // 检查重置条件
      const bjTime = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Shanghai'}));
      const needsReset = this.shouldReset(pointsInfo ? pointsInfo.current : 0, bjTime);
      
      if (needsReset.should) {
        console.log(`触发重置: ${needsReset.reason}`);
        const resetResult = await this.handleResetButton();
        
        if (resetResult) {
          console.log('重置成功');
          // 获取重置后积分
          await this.page.waitForTimeout(2000);
          const afterPoints = await this.getPointsInfo();
          return {
            success: true,
            pointsInfo: afterPoints || pointsInfo,
            resetExecuted: true,
            timestamp: new Date().toISOString()
          };
        } else {
          console.log('重置失败');
          return { success: false, pointsInfo, resetExecuted: false };
        }
      } else {
        console.log(`无需重置: ${needsReset.reason}`);
        return {
          success: true,
          pointsInfo,
          resetExecuted: false,
          timestamp: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.error('执行失败:', error.message);
      return { success: false };
    }
  }

  async performLogin() {
    try {
      await this.page.waitForTimeout(2000);
      
      const usernameField = this.page.locator('input[type="email"], input[name="email"]').first();
      await usernameField.fill(this.config.login.credentials.username);
      
      const passwordField = this.page.locator('input[type="password"]').first();
      await passwordField.fill(this.config.login.credentials.password);
      
      const loginButton = this.page.locator('button[type="submit"], button:has-text("登录")').first();
      await loginButton.click();
      
      await this.page.waitForTimeout(3000);
      return this.page.url().includes('/dashboard');
      
    } catch (error) {
      console.error('登录出错:', error.message);
      return false;
    }
  }

  async handlePopups() {
    try {
      const closeButton = this.page.locator('button[aria-label*="关闭"], button.absolute').first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
        await this.page.waitForTimeout(1000);
      }
    } catch (error) {
      // 忽略弹窗处理错误
    }
  }

  async handleResetButton() {
    try {
      await this.page.waitForTimeout(3000);
      
      // 查找重置按钮
      const buttons = await this.page.locator('button').all();
      let resetButton = null;
      let buttonText = '';
      
      for (const button of buttons) {
        const text = await button.textContent();
        if (text && (text.includes('重置') || text.includes('积分'))) {
          resetButton = button;
          buttonText = text.trim();
          console.log(`找到重置按钮: "${buttonText}"`);
          break;
        }
      }
      
      if (!resetButton) {
        console.log('未找到重置按钮');
        return false;
      }
      
      // 检查按钮状态
      if (buttonText.includes('已用完') || buttonText.includes('0/1')) {
        console.log('今日已用完，跳过');
        return true;
      }
      
      // 点击重置按钮
      if (buttonText.includes('1/1') || buttonText.includes('可用')) {
        console.log('执行重置点击...');
        
        try {
          await resetButton.click({ force: true });
          await this.page.waitForTimeout(1000);
        } catch (e) {
          // 使用JavaScript点击
          await this.page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent && btn.textContent.includes('重置')) {
                btn.click();
                break;
              }
            }
          });
          await this.page.waitForTimeout(1000);
        }
        
        // 查找并点击确认按钮
        const confirmSelectors = [
          'button:has-text("确认")',
          'button:has-text("确定")',
          '.modal button:last-child',
          '.dialog button:last-child'
        ];
        
        for (const selector of confirmSelectors) {
          try {
            const confirmButton = this.page.locator(selector).first();
            if (await confirmButton.isVisible({ timeout: 2000 })) {
              console.log('点击确认按钮');
              await confirmButton.click({ force: true });
              await this.page.waitForTimeout(2000);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('重置按钮处理出错:', error.message);
      return false;
    }
  }

  async getPointsInfo() {
    try {
      await this.page.waitForTimeout(2000);
      
      const pointsElement = this.page.locator('div.text-2xl.font-bold.text-primary').first();
      
      if (await pointsElement.isVisible({ timeout: 5000 })) {
        const pointsText = await pointsElement.textContent();
        const match = pointsText.trim().match(/^([\d,]+)\s*\/\s*([\d,]+)$/);
        
        if (match) {
          const current = parseInt(match[1].replace(/,/g, ''));
          const total = parseInt(match[2].replace(/,/g, ''));
          const percentage = Math.round((current / total) * 100);
          
          return {
            current: current,
            total: total,
            percentage: percentage,
            formatted: `${current.toLocaleString()}/${total.toLocaleString()}`
          };
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('获取积分信息出错:', error.message);
      return null;
    }
  }

  shouldReset(currentPoints, bjTime) {
    const hour = bjTime.getHours();
    const minute = bjTime.getMinutes();
    
    // 条件1: 积分小于500
    if (currentPoints < 500) {
      return {
        should: true,
        reason: `积分不足 (${currentPoints} < 500)`
      };
    }
    
    // 条件2: 北京时间 23:58-23:59 (时间窗口，避免错过精确时间点)
    if (hour === 23 && minute >= 58) {
      return {
        should: true,
        reason: `时间到达 23:${minute.toString().padStart(2, '0')} (每日重置时间窗口 23:58-23:59)`
      };
    }
    
    return {
      should: false,
      reason: `积分充足 (${currentPoints}) 且非重置时间 (${hour}:${minute.toString().padStart(2, '0')})`
    };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = HeadlessAutomation;