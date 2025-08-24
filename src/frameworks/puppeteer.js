const puppeteer = require('puppeteer');

class PuppeteerAutomation {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
  }

  async execute() {
    try {
      console.log('启动 Puppeteer 浏览器...');
      this.browser = await puppeteer.launch({
        headless: this.config.automation.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      this.page = await this.browser.newPage();
      
      // 设置超时
      this.page.setDefaultTimeout(this.config.automation.timeout);
      
      console.log(`导航到: ${this.config.automation.url}`);
      await this.page.goto(this.config.automation.url, { waitUntil: 'networkidle2' });
      
      // 查找按钮
      const button = await this.findButton();
      if (!button) {
        console.error('未找到重置按钮');
        return false;
      }
      
      // 检查按钮状态
      const buttonText = await this.page.evaluate(el => el.textContent, button);
      console.log(`按钮文本: ${buttonText}`);
      
      // 判断是否需要点击
      const needsClick = this.needsClick(buttonText);
      if (!needsClick) {
        console.log('按钮显示已重置或今日次数已用完，无需点击');
        return true; // 这也算成功
      }
      
      // 点击按钮
      console.log('点击重置按钮...');
      await button.click();
      
      // 等待并验证结果
      await this.page.waitForTimeout(2000);
      
      return await this.verifySuccess();
      
    } catch (error) {
      console.error('Puppeteer 执行错误:', error.message);
      return false;
    }
  }

  async findButton() {
    // 首选：按文本内容查找
    for (const keyword of this.config.button.textKeywords) {
      try {
        const button = await this.page.$x(`//button[contains(text(), '${keyword}')]`);
        if (button.length > 0) {
          console.log(`通过文本找到按钮: ${keyword}`);
          return button[0];
        }
      } catch (e) {
        // 继续尝试下一个关键词
      }
    }
    
    // 兜底：通过CSS类名查找
    try {
      const classSelector = this.config.button.cssClasses.map(cls => `.${cls}`).join('');
      const buttons = await this.page.$$((`button${classSelector}`));
      
      for (const button of buttons) {
        const text = await this.page.evaluate(el => el.textContent, button);
        if (this.config.button.textKeywords.some(keyword => 
          text.includes(keyword) || text.includes('重置') || text.includes('积分')
        )) {
          console.log('通过CSS类名找到按钮');
          return button;
        }
      }
    } catch (e) {
      console.error('通过CSS类名查找失败:', e.message);
    }
    
    return null;
  }

  needsClick(buttonText) {
    // 检查是否显示可用状态
    const isAvailable = this.config.button.availableIndicators.some(indicator =>
      buttonText.includes(indicator)
    );
    
    // 检查是否已经重置
    const isAlreadyReset = this.config.button.successIndicators.some(indicator =>
      buttonText.includes(indicator)
    );
    
    return isAvailable && !isAlreadyReset;
  }

  async verifySuccess() {
    try {
      // 重新获取按钮文本
      const button = await this.findButton();
      if (button) {
        const newText = await this.page.evaluate(el => el.textContent, button);
        console.log(`点击后按钮文本: ${newText}`);
        
        const isSuccess = this.config.button.successIndicators.some(indicator =>
          newText.includes(indicator)
        );
        
        if (isSuccess) {
          console.log('验证成功：按钮文本显示已重置');
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
          const elements = await this.page.$$(selector);
          for (const element of elements) {
            const text = await this.page.evaluate(el => el.textContent, element);
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

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = PuppeteerAutomation;