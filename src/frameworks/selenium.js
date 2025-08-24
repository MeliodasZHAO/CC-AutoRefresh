const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

class SeleniumAutomation {
  constructor(config) {
    this.config = config;
    this.driver = null;
  }

  async execute() {
    try {
      console.log('启动 Selenium WebDriver...');
      
      const options = new chrome.Options();
      if (this.config.automation.headless) {
        options.addArguments('--headless');
      }
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      
      this.driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
      
      // 设置超时
      await this.driver.manage().setTimeouts({
        implicit: this.config.automation.timeout,
        pageLoad: this.config.automation.timeout
      });
      
      console.log(`导航到: ${this.config.automation.url}`);
      await this.driver.get(this.config.automation.url);
      
      // 等待页面加载
      await this.driver.sleep(3000);
      
      // 查找按钮
      const button = await this.findButton();
      if (!button) {
        console.error('未找到重置按钮');
        return false;
      }
      
      // 检查按钮状态
      const buttonText = await button.getText();
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
      await this.driver.sleep(2000);
      
      return await this.verifySuccess();
      
    } catch (error) {
      console.error('Selenium 执行错误:', error.message);
      return false;
    }
  }

  async findButton() {
    // 首选：按文本内容查找
    for (const keyword of this.config.button.textKeywords) {
      try {
        const button = await this.driver.findElement(
          By.xpath(`//button[contains(text(), '${keyword}')]`)
        );
        if (button) {
          console.log(`通过文本找到按钮: ${keyword}`);
          return button;
        }
      } catch (e) {
        // 继续尝试下一个关键词
      }
    }
    
    // 兜底：通过CSS类名查找
    try {
      const buttons = await this.driver.findElements(By.css('button'));
      
      for (const button of buttons) {
        const className = await button.getAttribute('class');
        const hasRequiredClasses = this.config.button.cssClasses.every(cls =>
          className.includes(cls)
        );
        
        if (hasRequiredClasses) {
          const text = await button.getText();
          if (this.config.button.textKeywords.some(keyword => 
            text.includes(keyword) || text.includes('重置') || text.includes('积分')
          )) {
            console.log('通过CSS类名找到按钮');
            return button;
          }
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
        const newText = await button.getText();
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
          const elements = await this.driver.findElements(By.css(selector));
          for (const element of elements) {
            const text = await element.getText();
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
    if (this.driver) {
      await this.driver.quit();
    }
  }
}

module.exports = SeleniumAutomation;