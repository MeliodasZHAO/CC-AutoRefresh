#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

class SimpleHttpTest {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async testDashboardAccess() {
    try {
      console.log('测试直接访问Dashboard...');
      
      const response = await this.makeRequest('GET', 'https://www.claudecode-cn.com/dashboard');
      
      console.log('响应长度:', response.length);
      console.log('响应前500字符:');
      console.log(response.substring(0, 500));
      
      // 检查是否需要登录
      if (response.includes('login') || response.includes('登录')) {
        console.log('\n❌ 需要登录才能访问Dashboard');
        return false;
      }
      
      // 检查是否有重置按钮
      const resetButtonPatterns = [
        /今日已用完\s*\((\d+)\/(\d+)\)/,
        /点击重置积分至上限\s*\((\d+)\/(\d+)/,
        /重置积分.*?\((\d+)\/(\d+)\)/
      ];
      
      let found = false;
      for (const pattern of resetButtonPatterns) {
        const match = response.match(pattern);
        if (match) {
          console.log(`\n✅ 找到重置按钮: ${match[0]}`);
          console.log(`当前状态: 已使用 ${match[1]} / 总计 ${match[2]}`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log('\n🔍 未找到明确的重置按钮模式，搜索相关文本...');
        if (response.includes('重置')) {
          console.log('页面包含"重置"关键字');
        }
        if (response.includes('积分')) {
          console.log('页面包含"积分"关键字');
        }
        if (response.includes('今日')) {
          console.log('页面包含"今日"关键字');
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('测试失败:', error.message);
      return false;
    }
  }

  makeRequest(method, url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'close'
        }
      };
      
      const req = https.request(options, (res) => {
        let responseData = Buffer.alloc(0);
        
        res.on('data', (chunk) => {
          responseData = Buffer.concat([responseData, chunk]);
        });
        
        res.on('end', () => {
          let finalData = responseData;
          
          // 处理压缩
          if (res.headers['content-encoding'] === 'gzip') {
            const zlib = require('zlib');
            try {
              finalData = zlib.gunzipSync(responseData);
            } catch (e) {
              console.error('解压gzip失败:', e.message);
            }
          }
          
          resolve(finalData.toString('utf8'));
        });
      });
      
      req.on('error', (e) => {
        reject(e);
      });
      
      req.end();
    });
  }
}

// 运行测试
const test = new SimpleHttpTest();
test.testDashboardAccess();