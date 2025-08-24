#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

class ApiAnalyzer {
  constructor() {
    this.requests = [];
    this.responses = [];
  }

  async analyze() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 监听所有网络请求
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      const headers = request.headers();
      const postData = request.postData();
      
      console.log(`📤 ${method} ${url}`);
      
      this.requests.push({
        url,
        method,
        headers,
        postData,
        timestamp: new Date().toISOString()
      });
    });
    
    // 监听所有网络响应
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      const headers = response.headers();
      
      console.log(`📥 ${status} ${url}`);
      
      let body = null;
      try {
        if (response.status() < 300 && !url.includes('.js') && !url.includes('.css') && !url.includes('.png')) {
          body = await response.text();
        }
      } catch (e) {
        // 忽略无法读取的响应
      }
      
      this.responses.push({
        url,
        status,
        headers,
        body: body ? body.substring(0, 500) : null, // 截断长响应
        timestamp: new Date().toISOString()
      });
    });
    
    try {
      console.log('开始分析API调用...');
      console.log('1. 导航到登录页面');
      
      // 第一步：访问登录页面
      await page.goto(config.login.loginUrl);
      await page.waitForLoadState('networkidle');
      
      console.log('\n2. 填写登录信息并登录');
      
      // 第二步：登录
      const usernameField = page.locator('input[type="email"], input[name="email"]').first();
      await usernameField.fill(config.login.credentials.username);
      
      const passwordField = page.locator('input[type="password"]').first();
      await passwordField.fill(config.login.credentials.password);
      
      const loginButton = page.locator('button[type="submit"]').first();
      await loginButton.click();
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      console.log('\n3. 访问Dashboard');
      
      // 第三步：访问Dashboard
      await page.goto(config.automation.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      console.log('\n4. 查找并分析重置按钮');
      
      // 第四步：查找重置相关的按钮和请求
      const buttons = await page.locator('button').all();
      for (let i = 0; i < buttons.length; i++) {
        const text = await buttons[i].textContent();
        if (text && text.includes('重置')) {
          console.log(`发现重置按钮: "${text}"`);
          
          // 如果按钮可点击，尝试点击并观察网络请求
          const isEnabled = await buttons[i].isEnabled();
          if (isEnabled && !text.includes('已用完')) {
            console.log('尝试点击重置按钮...');
            await buttons[i].click();
            await page.waitForTimeout(2000);
            
            // 如果有确认弹窗，也点击
            try {
              const confirmButton = page.locator('button:has-text("确认")').first();
              if (await confirmButton.isVisible()) {
                console.log('点击确认按钮...');
                await confirmButton.click();
                await page.waitForTimeout(2000);
              }
            } catch (e) {
              // 没有确认按钮
            }
            
            break;
          }
        }
      }
      
    } catch (error) {
      console.error('分析过程出错:', error.message);
    } finally {
      await browser.close();
      
      // 保存分析结果
      this.saveResults();
    }
  }
  
  saveResults() {
    const results = {
      analysis_time: new Date().toISOString(),
      requests: this.requests,
      responses: this.responses
    };
    
    fs.writeFileSync('api-analysis.json', JSON.stringify(results, null, 2));
    console.log('\n📊 API分析完成！');
    console.log('结果已保存到 api-analysis.json');
    
    // 分析登录相关的请求
    console.log('\n🔐 登录相关请求:');
    this.requests.filter(req => 
      req.url.includes('login') || 
      req.url.includes('auth') || 
      req.method === 'POST'
    ).forEach(req => {
      console.log(`  ${req.method} ${req.url}`);
      if (req.postData) {
        console.log(`    数据: ${req.postData}`);
      }
    });
    
    // 分析重置相关的请求
    console.log('\n🔄 重置相关请求:');
    this.requests.filter(req => 
      req.url.includes('reset') || 
      req.url.includes('point') || 
      (req.method === 'POST' && !req.url.includes('login'))
    ).forEach(req => {
      console.log(`  ${req.method} ${req.url}`);
      if (req.postData) {
        console.log(`    数据: ${req.postData}`);
      }
    });
  }
}

// 运行分析
const analyzer = new ApiAnalyzer();
analyzer.analyze();