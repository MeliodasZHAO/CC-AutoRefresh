const { chromium } = require('playwright');

class HeadlessAutomation {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
  }

  async execute() {
    try {
      console.log('启动浏览器...');
      
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      this.page = await this.browser.newPage({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      this.page.setDefaultTimeout(30000);
      
      // 登录
      console.log('开始登录...');
      await this.page.goto(this.config.login.loginUrl);
      await this.page.waitForLoadState('networkidle');
      
      if (!await this.performLogin()) {
        return { success: false, error: '登录失败' };
      }
      
      console.log('登录成功');
      
      // 进入dashboard
      await this.page.goto(this.config.automation?.url || 'https://www.claudecode-cn.com/dashboard');
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      // 执行重置
      const resetResult = await this.performReset();
      
      return {
        success: resetResult,
        resetExecuted: resetResult,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.log(`执行异常: ${error.message}`);
      return { 
        success: false, 
        error: error.message
      };
    }
  }

  async performLogin() {
    try {
      // 使用配置中的选择器
      const selectors = this.config.login.selectors;
      
      // 填写用户名
      await this.page.fill(selectors.usernameField, this.config.login.credentials.username);
      
      // 填写密码  
      await this.page.fill(selectors.passwordField, this.config.login.credentials.password);
      
      // 点击登录按钮
      await this.page.click(selectors.loginButton);
      
      // 等待跳转
      await this.page.waitForTimeout(3000);
      
      // 检查是否登录成功
      const url = this.page.url();
      return !url.includes('/login');
      
    } catch (error) {
      console.log(`登录异常: ${error.message}`);
      return false;
    }
  }

  async performReset() {
    try {
      console.log('查找重置按钮...');
      
      // 查找包含"重置"或"积分"的按钮
      const buttons = await this.page.$$('button');
      let resetButton = null;
      
      for (const button of buttons) {
        const text = await button.textContent();
        if (text && (text.includes('重置') || text.includes('积分'))) {
          // 检查按钮是否可用
          if (!text.includes('已用完') && !text.includes('0/1')) {
            resetButton = button;
            console.log(`找到重置按钮: ${text.trim()}`);
            break;
          }
        }
      }
      
      if (!resetButton) {
        console.log('未找到可用的重置按钮');
        return false;
      }
      
      // 点击重置按钮
      await resetButton.click();
      await this.page.waitForTimeout(2000);
      
      // 查找确认按钮
      try {
        await this.page.click('button:has-text("确认"), button:has-text("确定")', { timeout: 3000 });
        await this.page.waitForTimeout(2000);
      } catch (e) {
        // 可能没有确认对话框
      }
      
      console.log('重置操作完成');
      return true;
      
    } catch (error) {
      console.log(`重置操作失败: ${error.message}`);
      return false;
    }
  }

  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      console.log(`清理资源出错: ${error.message}`);
    }
  }
}

module.exports = HeadlessAutomation;