const { chromium } = require('playwright');

class PlaywrightAutomation {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
  }

  async execute() {
    try {
      console.log('启动 Playwright 浏览器...');
      this.browser = await chromium.launch({ 
        headless: this.config.automation.headless 
      });
      this.page = await this.browser.newPage();
      
      // 设置超时
      this.page.setDefaultTimeout(this.config.automation.timeout);
      
      console.log(`导航到: ${this.config.automation.url}`);
      await this.page.goto(this.config.automation.url);
      
      // 等待页面加载
      await this.page.waitForLoadState('networkidle');
      
      // 检查是否需要登录
      const needsLogin = await this.checkIfNeedsLogin();
      if (needsLogin) {
        console.log('检测到需要登录，开始登录流程...');
        const loginSuccess = await this.performLogin();
        if (!loginSuccess) {
          console.error('登录失败');
          return false;
        }
        console.log('登录成功，继续执行重置操作');
      }
      
      // 等待页面完全加载
      await this.page.waitForTimeout(3000);
      console.log(`当前页面URL: ${this.page.url()}`);
      
      // 处理初始弹窗
      await this.handleInitialPopup();
      
      // 截图调试（仅在非无头模式）
      if (!this.config.automation.headless) {
        console.log('页面已加载，查找按钮中...');
      }
      
      // 第一步：查找并点击主按钮
      const primaryButton = await this.findPrimaryButton();
      if (!primaryButton) {
        console.error('未找到重置按钮');
        return false;
      }
      
      // 检查按钮状态
      const buttonText = await primaryButton.textContent();
      console.log(`主按钮文本: ${buttonText}`);
      
      // 判断是否需要点击
      const needsClick = this.needsPrimaryClick(buttonText);
      if (!needsClick) {
        console.log('按钮显示已重置或今日次数已用完，无需点击');
        return true; // 这也算成功
      }
      
      // 点击主按钮
      console.log('点击重置按钮...');
      await primaryButton.click();
      
      // 第二步：等待并点击确认按钮
      console.log('等待确认弹窗...');
      await this.page.waitForTimeout(1000); // 等待弹窗出现
      
      const confirmButton = await this.findConfirmButton();
      if (!confirmButton) {
        console.error('未找到确认按钮');
        return false;
      }
      
      console.log('点击确认重置按钮...');
      await confirmButton.click();
      
      // 等待并验证结果
      await this.page.waitForTimeout(3000); // 增加等待时间
      
      return await this.verifySuccess();
      
    } catch (error) {
      console.error('Playwright 执行错误:', error.message);
      return false;
    }
  }

  async findPrimaryButton() {
    // 首选：按文本内容查找主按钮
    for (const keyword of this.config.button.primary.textKeywords) {
      try {
        const button = await this.page.locator(`button:has-text("${keyword}")`).first();
        if (await button.isVisible()) {
          console.log(`通过文本找到主按钮: ${keyword}`);
          return button;
        }
      } catch (e) {
        // 继续尝试下一个关键词
      }
    }
    
    // 查找包含重置相关文本的按钮
    try {
      const buttons = await this.page.locator('button').all();
      for (const button of buttons) {
        const text = await button.textContent();
        if (text && (text.includes('重置') || text.includes('积分') || text.includes('今日已用完'))) {
          console.log(`找到重置相关按钮: ${text}`);
          return button;
        }
      }
    } catch (e) {
      console.error('查找重置相关按钮失败:', e.message);
    }
    
    // 兜底：通过CSS类名查找主按钮
    try {
      const classSelectors = this.config.button.primary.cssClasses.map(cls => `.${cls.replace(':', '\\:')}`);
      const classSelector = classSelectors.join('');
      const buttons = await this.page.locator(`button${classSelector}`).all();
      
      for (const button of buttons) {
        const text = await button.textContent();
        if (this.config.button.primary.textKeywords.some(keyword => 
          text.includes(keyword) || text.includes('重置积分')
        )) {
          console.log('通过CSS类名找到主按钮');
          return button;
        }
      }
    } catch (e) {
      console.error('通过CSS类名查找主按钮失败:', e.message);
    }
    
    return null;
  }

  async findConfirmButton() {
    // 首选：按文本内容查找确认按钮
    for (const keyword of this.config.button.confirm.textKeywords) {
      try {
        const button = await this.page.locator(`button:has-text("${keyword}")`).first();
        if (await button.isVisible()) {
          console.log(`找到确认按钮: ${keyword}`);
          return button;
        }
      } catch (e) {
        // 继续尝试下一个关键词
      }
    }
    
    // 兜底：通过CSS类名查找确认按钮
    try {
      const classSelectors = this.config.button.confirm.cssClasses.map(cls => `.${cls.replace(':', '\\:')}`);
      const classSelector = classSelectors.join('');
      const buttons = await this.page.locator(`button${classSelector}`).all();
      
      for (const button of buttons) {
        const text = await button.textContent();
        if (this.config.button.confirm.textKeywords.some(keyword => 
          text.includes(keyword)
        )) {
          console.log('通过CSS类名找到确认按钮');
          return button;
        }
      }
    } catch (e) {
      console.error('通过CSS类名查找确认按钮失败:', e.message);
    }
    
    return null;
  }

  needsPrimaryClick(buttonText) {
    // 检查是否显示可用状态
    const isAvailable = this.config.button.primary.availableIndicators.some(indicator =>
      buttonText.includes(indicator)
    );
    
    // 检查是否已经使用
    const isUsed = this.config.button.primary.usedIndicators.some(indicator =>
      buttonText.includes(indicator)
    );
    
    return isAvailable && !isUsed;
  }

  async verifySuccess() {
    try {
      // 等待页面更新
      await this.page.waitForTimeout(1000);
      
      // 重新获取主按钮文本
      const primaryButton = await this.findPrimaryButton();
      if (primaryButton) {
        const newText = await primaryButton.textContent();
        console.log(`点击后主按钮文本: ${newText}`);
        
        const isUsed = this.config.button.primary.usedIndicators.some(indicator =>
          newText.includes(indicator)
        );
        
        if (isUsed) {
          console.log('验证成功：主按钮文本显示已使用');
          return true;
        }
      }
      
      // 检查是否有成功提示
      const successSelectors = [
        '[class*="toast"]',
        '[class*="notification"]',
        '[class*="alert-success"]',
        '.success',
        '.alert'
      ];
      
      for (const selector of successSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          for (const element of elements) {
            const text = await element.textContent();
            if (text.includes('成功') || text.includes('重置') || text.includes('完成')) {
              console.log(`找到成功提示: ${text}`);
              return true;
            }
          }
        } catch (e) {
          // 继续检查下一个选择器
        }
      }
      
      console.log('未找到明确的成功标识');
      return false;
      
    } catch (error) {
      console.error('验证结果时出错:', error.message);
      return false;
    }
  }

  async checkIfNeedsLogin() {
    try {
      // 检查当前URL是否包含登录页面标识
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/signin') || currentUrl.includes('/auth')) {
        return true;
      }
      
      // 检查页面是否有登录表单
      const loginForm = await this.page.locator('form').first();
      if (await loginForm.isVisible()) {
        const hasUsernameField = await this.page.locator(this.config.login.selectors.usernameField).isVisible();
        const hasPasswordField = await this.page.locator(this.config.login.selectors.passwordField).isVisible();
        if (hasUsernameField && hasPasswordField) {
          return true;
        }
      }
      
      // 检查是否有登录按钮或链接
      const loginButton = await this.page.locator('a:has-text("登录"), a:has-text("登入"), a:has-text("Sign in")').first();
      if (await loginButton.isVisible()) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('检查登录状态时出错:', error.message);
      return false;
    }
  }

  async handleInitialPopup() {
    try {
      console.log('检查初始弹窗...');
      
      // 查找关闭按钮 (X 按钮)
      const closeButton = await this.page.locator('button.absolute.top-4.right-4, button.absolute.top-6.right-6').first();
      
      if (await closeButton.isVisible()) {
        console.log('发现初始弹窗，正在关闭...');
        await closeButton.click();
        await this.page.waitForTimeout(1000); // 等待弹窗关闭动画
        console.log('初始弹窗已关闭');
      } else {
        console.log('未发现初始弹窗');
      }
    } catch (error) {
      console.log('处理初始弹窗时出错:', error.message);
      // 不影响主流程，继续执行
    }
  }

  async performLogin() {
    try {
      // 如果当前页面不是登录页面，导航到登录页面
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/login') && !currentUrl.includes('/signin')) {
        console.log('导航到登录页面...');
        await this.page.goto(this.config.login.loginUrl);
        await this.page.waitForLoadState('networkidle');
      }
      
      // 检查是否已配置登录凭据
      if (!this.config.login.credentials.username || !this.config.login.credentials.password) {
        console.error('登录凭据未配置，请在config.json中填入用户名和密码');
        return false;
      }
      
      // 填写用户名
      console.log('填写用户名...');
      const usernameField = this.page.locator(this.config.login.selectors.usernameField).first();
      await usernameField.fill(this.config.login.credentials.username);
      
      // 填写密码
      console.log('填写密码...');
      const passwordField = this.page.locator(this.config.login.selectors.passwordField).first();
      await passwordField.fill(this.config.login.credentials.password);
      
      // 点击登录按钮
      console.log('点击登录按钮...');
      const loginButton = this.page.locator(this.config.login.selectors.loginButton).first();
      await loginButton.click();
      
      // 等待登录完成
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      // 验证登录是否成功
      const finalUrl = this.page.url();
      if (finalUrl.includes('/dashboard') || !finalUrl.includes('/login')) {
        console.log('登录成功');
        return true;
      } else {
        console.error('登录失败：仍在登录页面');
        return false;
      }
      
    } catch (error) {
      console.error('登录过程中出错:', error.message);
      return false;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = PlaywrightAutomation;