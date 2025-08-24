const { chromium } = require('playwright');

class HeadlessAutomation {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
  }

  async execute() {
    try {
      console.log('启动无头浏览器模式 (云服务器友好)...');
      
      // 云服务器友好的浏览器配置
      this.browser = await chromium.launch({
        headless: true, // 强制无头模式
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // 设置简化的用户代理和视窗
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
      // 设置超时
      this.page.setDefaultTimeout(this.config.automation.timeout);
      
      console.log('导航到登录页面...');
      await this.page.goto(this.config.login.loginUrl);
      await this.page.waitForLoadState('domcontentloaded');
      
      // 登录流程
      console.log('执行登录...');
      const loginSuccess = await this.performLogin();
      if (!loginSuccess) {
        console.error('登录失败');
        return false;
      }
      
      console.log('登录成功，导航到Dashboard...');
      await this.page.goto(this.config.automation.url);
      await this.page.waitForLoadState('domcontentloaded');
      
      // 处理可能的弹窗
      await this.handlePopups();
      
      // 获取当前积分信息
      const pointsInfo = await this.getPointsInfo();
      if (pointsInfo) {
        console.log(`📊 当前积分: ${pointsInfo.current}/${pointsInfo.total} (${pointsInfo.percentage}%)`);
      }
      
      // 检查是否需要重置
      const bjTime = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Shanghai'}));
      const needsReset = this.shouldResetByConditions(pointsInfo ? pointsInfo.current : 0, bjTime);
      
      let resetResult = false;
      if (needsReset.should) {
        console.log(`🔥 满足重置条件: ${needsReset.reason}`);
        resetResult = await this.handleResetButton();
      } else {
        console.log(`✓ 跳过重置 - ${needsReset.reason}`);
        resetResult = true; // 跳过重置也算成功
      }
      
      // 返回包含积分信息的完整结果
      return {
        success: resetResult,
        pointsInfo: pointsInfo,
        timestamp: new Date().toISOString(),
        resetExecuted: needsReset.should
      };
      
    } catch (error) {
      console.error('无头浏览器执行错误:', error.message);
      return false;
    }
  }

  async performLogin() {
    try {
      // 等待页面加载
      await this.page.waitForTimeout(2000);
      
      // 填写用户名
      const usernameField = this.page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"]').first();
      await usernameField.fill(this.config.login.credentials.username);
      
      // 填写密码
      const passwordField = this.page.locator('input[type="password"]').first();
      await passwordField.fill(this.config.login.credentials.password);
      
      // 点击登录按钮
      const loginButton = this.page.locator('button[type="submit"], button:has-text("登录")').first();
      await loginButton.click();
      
      // 等待登录完成
      await this.page.waitForTimeout(3000);
      
      // 检查是否跳转到dashboard
      const currentUrl = this.page.url();
      return currentUrl.includes('/dashboard');
      
    } catch (error) {
      console.error('登录过程出错:', error.message);
      return false;
    }
  }

  async handlePopups() {
    try {
      // 查找关闭按钮
      const closeButton = this.page.locator('button[aria-label*="关闭"], button.absolute').first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        console.log('关闭初始弹窗...');
        await closeButton.click();
        await this.page.waitForTimeout(1000);
      }
    } catch (error) {
      // 忽略弹窗处理错误
    }
  }

  async handleResetButton() {
    try {
      console.log('查找重置按钮...');
      
      // 等待页面加载完成
      await this.page.waitForTimeout(3000);
      
      // 查找所有按钮
      const buttons = await this.page.locator('button').all();
      console.log(`页面上共有 ${buttons.length} 个按钮`);
      
      let resetButton = null;
      let buttonText = '';
      
      for (const button of buttons) {
        const text = await button.textContent();
        if (text && (text.includes('重置') || text.includes('积分') || text.includes('今日'))) {
          resetButton = button;
          buttonText = text.trim();
          console.log(`找到重置相关按钮: "${buttonText}"`);
          break;
        }
      }
      
      if (!resetButton) {
        console.log('未找到重置按钮');
        return false;
      }
      
      // 检查按钮状态
      if (buttonText.includes('已用完') || buttonText.includes('0/1')) {
        console.log('按钮显示今日已用完，无需操作');
        return true; // 这也算成功
      }
      
      // 如果按钮可用，执行点击
      if (buttonText.includes('1/1') || buttonText.includes('可用')) {
        console.log('按钮可用，执行点击...');
        
        // 点击主按钮
        await resetButton.click();
        await this.page.waitForTimeout(1000);
        
        // 查找确认按钮
        const confirmButton = this.page.locator('button:has-text("确认")').first();
        if (await confirmButton.isVisible({ timeout: 3000 })) {
          console.log('点击确认按钮...');
          await confirmButton.click();
          await this.page.waitForTimeout(2000);
        }
        
        console.log('重置操作已完成');
        return true;
      }
      
      console.log(`按钮状态不明确: ${buttonText}`);
      return false;
      
    } catch (error) {
      console.error('处理重置按钮时出错:', error.message);
      return false;
    }
  }

  async getPointsInfo() {
    try {
      console.log('📊 获取当前积分信息...');
      
      // 等待页面加载完成
      await this.page.waitForTimeout(2000);
      
      // 查找积分显示元素
      const pointsElement = this.page.locator('div.text-2xl.font-bold.text-primary').first();
      
      if (await pointsElement.isVisible({ timeout: 5000 })) {
        const pointsText = await pointsElement.textContent();
        console.log(`找到积分元素: "${pointsText}"`);
        
        // 解析积分信息 格式如: "18,881 / 20,000"
        const match = pointsText.trim().match(/^([\d,]+)\s*\/\s*([\d,]+)$/);
        
        if (match) {
          const current = parseInt(match[1].replace(/,/g, ''));
          const total = parseInt(match[2].replace(/,/g, ''));
          const percentage = Math.round((current / total) * 100);
          
          return {
            current: current,
            total: total,
            percentage: percentage,
            text: pointsText.trim(),
            formatted: `${current.toLocaleString()}/${total.toLocaleString()}`
          };
        } else {
          console.log('积分文本格式无法解析:', pointsText);
          return null;
        }
      } else {
        console.log('未找到积分显示元素');
        
        // 尝试其他可能的选择器
        const altSelectors = [
          'div:has-text("/")', // 包含斜杠的div
          '.text-primary:has-text("/")', // 包含斜杠的主色文本
          '[class*="font-bold"]:has-text("/")', // 包含斜杠的粗体文本
        ];
        
        for (const selector of altSelectors) {
          try {
            const element = this.page.locator(selector).first();
            if (await element.isVisible({ timeout: 2000 })) {
              const text = await element.textContent();
              if (text && text.includes('/') && /\d/.test(text)) {
                console.log(`通过备选选择器找到: "${text}"`);
                // 尝试解析
                const match = text.trim().match(/(\d[\d,]*)\s*\/\s*(\d[\d,]*)/);
                if (match) {
                  const current = parseInt(match[1].replace(/,/g, ''));
                  const total = parseInt(match[2].replace(/,/g, ''));
                  const percentage = Math.round((current / total) * 100);
                  
                  return {
                    current: current,
                    total: total,
                    percentage: percentage,
                    text: text.trim(),
                    formatted: `${current.toLocaleString()}/${total.toLocaleString()}`
                  };
                }
              }
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
        
        return null;
      }
      
    } catch (error) {
      console.error('获取积分信息时出错:', error.message);
      return null;
    }
  }

  shouldResetByConditions(currentPoints, bjTime) {
    const hour = bjTime.getHours();
    const minute = bjTime.getMinutes();
    const threshold = this.config.automation.lowPointsThreshold || 500;
    
    // 条件1: 积分小于阈值
    if (currentPoints < threshold) {
      return {
        should: true,
        reason: `积分不足 (${currentPoints} < ${threshold})`
      };
    }
    
    // 条件2: 北京时间 23:55-23:56
    if (hour === 23 && minute >= 55 && minute <= 56) {
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

  async checkPointsOnly() {
    try {
      console.log('🔍 仅检查积分状态模式...');
      
      // 启动浏览器
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
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
      
      // 处理弹窗
      await this.handlePopups();
      
      // 只获取积分信息
      const pointsInfo = await this.getPointsInfo();
      
      return {
        success: true,
        pointsInfo: pointsInfo,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('检查积分时出错:', error.message);
      return { success: false };
    }
  }

  async executeForceReset() {
    try {
      console.log('🔄 强制重置模式 (忽略条件检查)...');
      
      // 启动浏览器
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
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
      
      // 处理弹窗
      await this.handlePopups();
      
      // 获取重置前积分
      const beforePoints = await this.getPointsInfo();
      
      // 强制执行重置按钮操作
      console.log('🔄 强制执行重置按钮...');
      const resetResult = await this.handleResetButtonForce();
      
      // 获取重置后积分
      await this.page.waitForTimeout(2000);
      const afterPoints = await this.getPointsInfo();
      
      return {
        success: resetResult,
        pointsInfo: afterPoints || beforePoints,
        beforeReset: beforePoints,
        afterReset: afterPoints,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('强制重置时出错:', error.message);
      return { success: false };
    }
  }

  async handleResetButtonForce() {
    try {
      // 查找重置相关按钮
      await this.page.waitForTimeout(3000);
      
      const buttons = await this.page.locator('button').all();
      console.log(`页面上共有 ${buttons.length} 个按钮`);
      
      let resetButton = null;
      let buttonText = '';
      
      for (const button of buttons) {
        const text = await button.textContent();
        if (text && (text.includes('重置') || text.includes('积分') || text.includes('今日'))) {
          resetButton = button;
          buttonText = text.trim();
          console.log(`找到重置相关按钮: "${buttonText}"`);
          break;
        }
      }
      
      if (!resetButton) {
        console.log('未找到重置按钮');
        return false;
      }
      
      // 强制点击，不管按钮状态
      console.log(`强制点击重置按钮: "${buttonText}"`);
      
      try {
        // 如果按钮被禁用，尝试启用它
        await this.page.evaluate((button) => {
          button.disabled = false;
          button.style.pointerEvents = 'auto';
          button.classList.remove('cursor-not-allowed');
        }, resetButton);
        
        await resetButton.click();
        await this.page.waitForTimeout(1000);
        
        // 查找确认按钮
        const confirmButton = this.page.locator('button:has-text("确认")').first();
        if (await confirmButton.isVisible({ timeout: 3000 })) {
          console.log('点击确认按钮...');
          await confirmButton.click();
          await this.page.waitForTimeout(2000);
        }
        
        console.log('强制重置操作已完成');
        return true;
        
      } catch (error) {
        console.log('强制点击失败，尝试其他方法:', error.message);
        
        // 备用方法：直接触发点击事件
        try {
          await this.page.evaluate((button) => {
            button.click();
          }, resetButton);
          
          await this.page.waitForTimeout(1000);
          
          const confirmButton = this.page.locator('button:has-text("确认")').first();
          if (await confirmButton.isVisible({ timeout: 3000 })) {
            await confirmButton.click();
            await this.page.waitForTimeout(2000);
          }
          
          return true;
        } catch (e) {
          console.error('所有点击方法都失败了:', e.message);
          return false;
        }
      }
      
    } catch (error) {
      console.error('强制重置按钮处理时出错:', error.message);
      return false;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = HeadlessAutomation;