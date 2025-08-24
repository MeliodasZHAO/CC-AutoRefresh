const https = require('https');
const http = require('http');
const { URL } = require('url');

class HttpAutomation {
  constructor(config) {
    this.config = config;
    this.cookies = new Map();
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async execute() {
    try {
      console.log('使用HTTP请求模式执行自动化...');
      
      // 第一步：登录
      console.log('开始登录流程...');
      const loginSuccess = await this.performLogin();
      if (!loginSuccess) {
        console.error('登录失败');
        return false;
      }
      console.log('登录成功');
      
      // 第二步：获取Dashboard页面
      console.log('获取Dashboard页面...');
      const dashboardData = await this.getDashboard();
      if (!dashboardData) {
        console.error('获取Dashboard失败');
        return false;
      }
      
      // 第三步：检查重置按钮状态
      console.log('检查重置按钮状态...');
      const buttonStatus = this.parseButtonStatus(dashboardData);
      console.log(`按钮状态: ${buttonStatus.text}`);
      
      if (!buttonStatus.canReset) {
        console.log('按钮显示已重置或今日次数已用完，无需操作');
        return true;
      }
      
      // 第四步：执行重置操作
      console.log('执行重置操作...');
      const resetSuccess = await this.performReset();
      if (!resetSuccess) {
        console.error('重置操作失败');
        return false;
      }
      
      console.log('重置操作成功');
      return true;
      
    } catch (error) {
      console.error('HTTP自动化执行错误:', error.message);
      return false;
    }
  }

  async performLogin() {
    try {
      console.log('HTTP模式：开始NextAuth登录流程...');
      
      // 第一步：获取session状态
      const sessionData = await this.makeRequest('GET', 'https://www.claudecode-cn.com/api/auth/session');
      console.log('当前session状态:', sessionData.substring(0, 100));
      
      // 第二步：获取登录页面
      const loginPageData = await this.makeRequest('GET', this.config.login.loginUrl);
      
      // 第三步：提取CSRF token（NextAuth通常使用）
      const csrfToken = this.extractNextAuthCsrfToken(loginPageData);
      console.log('CSRF Token:', csrfToken ? '已获取' : '未找到');
      
      // 第四步：使用NextAuth进行登录
      const loginData = this.buildNextAuthLoginData(csrfToken);
      const loginResponse = await this.makeRequest('POST', 'https://www.claudecode-cn.com/api/auth/callback/credentials', loginData, {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': this.config.login.loginUrl
      });
      
      console.log('登录响应状态:', loginResponse.substring(0, 200));
      
      // 第五步：验证登录是否成功
      const newSessionData = await this.makeRequest('GET', 'https://www.claudecode-cn.com/api/auth/session');
      return this.checkNextAuthLoginSuccess(newSessionData);
      
    } catch (error) {
      console.error('NextAuth登录过程出错:', error.message);
      return false;
    }
  }

  async getDashboard() {
    try {
      const response = await this.makeRequest('GET', this.config.automation.url);
      return response;
    } catch (error) {
      console.error('获取Dashboard失败:', error.message);
      return null;
    }
  }

  parseButtonStatus(htmlContent) {
    // 解析HTML内容，查找重置按钮
    const buttonPatterns = [
      /今日已用完\s*\((\d+)\/(\d+)\)/,
      /点击重置积分至上限\s*\((\d+)\/(\d+)\s*次?\)/,
      /重置积分.*?\((\d+)\/(\d+)\)/
    ];
    
    for (const pattern of buttonPatterns) {
      const match = htmlContent.match(pattern);
      if (match) {
        const used = parseInt(match[1]);
        const total = parseInt(match[2]);
        const canReset = used < total;
        
        return {
          text: match[0],
          used: used,
          total: total,
          canReset: canReset
        };
      }
    }
    
    // 如果找不到明确的状态，检查是否有"今日已用完"
    if (htmlContent.includes('今日已用完')) {
      return {
        text: '今日已用完',
        used: 1,
        total: 1,
        canReset: false
      };
    }
    
    return {
      text: '未找到按钮状态',
      used: 0,
      total: 0,
      canReset: false
    };
  }

  async performReset() {
    try {
      // 这里需要分析重置操作的具体API调用
      // 通常是POST请求到某个端点
      
      // 步骤1：可能需要先获取重置页面或API端点
      const resetEndpoint = this.findResetEndpoint();
      
      // 步骤2：提取必要的参数（如CSRF token）
      const resetData = await this.buildResetData();
      
      // 步骤3：发送重置请求
      const resetResponse = await this.makeRequest('POST', resetEndpoint, resetData, {
        'Content-Type': 'application/json'
      });
      
      // 步骤4：验证重置是否成功
      return this.checkResetSuccess(resetResponse);
      
    } catch (error) {
      console.error('重置操作出错:', error.message);
      return false;
    }
  }

  findResetEndpoint() {
    // 根据网站结构推测重置API端点
    const baseUrl = new URL(this.config.automation.url).origin;
    return `${baseUrl}/api/reset-points`; // 这个需要通过分析网络请求确定
  }

  async buildResetData() {
    // 构建重置请求的数据
    return JSON.stringify({
      action: 'reset',
      // 其他必要参数
    });
  }

  checkResetSuccess(response) {
    // 检查重置响应是否成功
    try {
      const data = JSON.parse(response);
      return data.success === true || data.status === 'success';
    } catch {
      return response.includes('成功') || response.includes('success');
    }
  }

  extractNextAuthCsrfToken(htmlContent) {
    // 提取NextAuth CSRF token
    const patterns = [
      /csrfToken['"]\s*:\s*['"]([^'"]+)['"]/,
      /"csrfToken":\s*"([^"]+)"/,
      /name="csrfToken"[^>]*value="([^"]+)"/,
      /value="([^"]+)"[^>]*name="csrfToken"/,
      /<meta name="csrf-token" content="([^"]+)"/
    ];
    
    for (const pattern of patterns) {
      const match = htmlContent.match(pattern);
      if (match) {
        console.log('找到NextAuth CSRF token');
        return match[1];
      }
    }
    
    console.log('未找到NextAuth CSRF token');
    return null;
  }

  extractCsrfToken(htmlContent) {
    return this.extractNextAuthCsrfToken(htmlContent);
  }

  buildNextAuthLoginData(csrfToken) {
    const params = new URLSearchParams();
    params.append('username', this.config.login.credentials.username);
    params.append('password', this.config.login.credentials.password);
    if (csrfToken) {
      params.append('csrfToken', csrfToken);
    }
    params.append('callbackUrl', this.config.automation.url);
    params.append('json', 'true');
    return params.toString();
  }

  buildLoginData(csrfToken) {
    return this.buildNextAuthLoginData(csrfToken);
  }

  checkNextAuthLoginSuccess(sessionData) {
    try {
      const session = JSON.parse(sessionData);
      return session && session.user && session.user.email;
    } catch {
      return sessionData.includes('user') && sessionData.includes('email');
    }
  }

  checkLoginSuccess(response) {
    return this.checkNextAuthLoginSuccess(response);
  }

  makeRequest(method, url, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const requestModule = isHttps ? https : http;
      
      const defaultHeaders = {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cookie': this.getCookieString()
      };
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: { ...defaultHeaders, ...headers }
      };
      
      if (data && method === 'POST') {
        options.headers['Content-Length'] = Buffer.byteLength(data);
      }
      
      const req = requestModule.request(options, (res) => {
        // 处理cookies
        if (res.headers['set-cookie']) {
          res.headers['set-cookie'].forEach(cookie => {
            this.parseCookie(cookie);
          });
        }
        
        let responseData = Buffer.alloc(0);
        
        res.on('data', (chunk) => {
          responseData = Buffer.concat([responseData, chunk]);
        });
        
        res.on('end', () => {
          let finalData = responseData;
          
          // 处理gzip压缩
          if (res.headers['content-encoding'] === 'gzip') {
            const zlib = require('zlib');
            try {
              finalData = zlib.gunzipSync(responseData);
            } catch (e) {
              console.error('解压gzip失败:', e.message);
            }
          } else if (res.headers['content-encoding'] === 'deflate') {
            const zlib = require('zlib');
            try {
              finalData = zlib.inflateSync(responseData);
            } catch (e) {
              console.error('解压deflate失败:', e.message);
            }
          }
          
          resolve(finalData.toString('utf8'));
        });
      });
      
      req.on('error', (e) => {
        reject(e);
      });
      
      if (data && method === 'POST') {
        req.write(data);
      }
      
      req.end();
    });
  }

  parseCookie(cookieHeader) {
    const [nameValue] = cookieHeader.split(';');
    const [name, value] = nameValue.split('=');
    if (name && value) {
      this.cookies.set(name.trim(), value.trim());
    }
  }

  getCookieString() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  async cleanup() {
    // HTTP版本无需特殊清理
    console.log('HTTP请求会话结束');
  }
}

module.exports = HttpAutomation;