#!/usr/bin/env node

/**
 * Ubuntu测试脚本 - 立即执行刷新测试
 * 专为Ubuntu服务器环境设计，包含详细调试信息
 */

const fs = require('fs');
const path = require('path');

console.log('🔥 Ubuntu测试模式启动！');
console.log(`⏰ 测试时间: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
console.log('🎯 目标: 立即执行积分刷新测试\n');

class UbuntuTestRunner {
    constructor() {
        this.startTime = new Date();
        this.config = this.loadConfig();
        this.AutoRefresh = require('./src/main.js');
    }

    loadConfig() {
        const configPath = path.join(__dirname, 'config.json');
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('✅ 配置文件加载成功');
            console.log(`📋 使用框架: ${config.automation.framework}`);
            console.log(`🌐 目标网站: ${config.automation.url}`);
            console.log(`📧 邮件启用: ${config.email.enabled ? '是' : '否'}`);
            return config;
        } catch (error) {
            console.error('❌ 配置文件加载失败:', error.message);
            throw error;
        }
    }

    async runImmediateTest() {
        console.log('\n🚀 开始立即刷新测试...');
        
        try {
            // 创建AutoRefresh实例
            const refresher = new this.AutoRefresh();
            
            // 强制设置为测试模式
            refresher.isTestMode = true;
            
            console.log('🔧 初始化自动刷新系统...');
            
            // 执行单次检查
            const result = await refresher.performSingleCheck();
            
            console.log('\n📊 测试结果汇总:');
            console.log(`   成功状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
            
            if (result.pointsInfo) {
                console.log(`   积分信息: ${result.pointsInfo.formatted} (${result.pointsInfo.percentage}%)`);
                console.log(`   当前积分: ${result.pointsInfo.current}/${result.pointsInfo.total}`);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ 测试执行失败:', error.message);
            console.error('📋 错误堆栈:', error.stack);
            throw error;
        }
    }

    async runFullDiagnostic() {
        console.log('\n🔍 开始完整诊断测试...');
        
        // 1. 环境检查
        console.log('\n📋 环境诊断:');
        console.log(`   Node.js版本: ${process.version}`);
        console.log(`   操作系统: ${process.platform}`);
        console.log(`   工作目录: ${process.cwd()}`);
        console.log(`   当前用户: ${process.env.USER || process.env.USERNAME || 'unknown'}`);
        
        // 2. 依赖检查
        console.log('\n📦 依赖检查:');
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        const dependencies = packageJson.dependencies || {};
        
        for (const [pkg, version] of Object.entries(dependencies)) {
            try {
                require.resolve(pkg);
                console.log(`   ✅ ${pkg}: ${version}`);
            } catch (error) {
                console.log(`   ❌ ${pkg}: 未安装`);
            }
        }
        
        // 3. 网络连接测试
        console.log('\n🌐 网络连接测试:');
        try {
            const https = require('https');
            const url = new URL(this.config.automation.url);
            
            await new Promise((resolve, reject) => {
                const req = https.get({
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: '/',
                    timeout: 10000
                }, (res) => {
                    console.log(`   ✅ ${url.hostname}: HTTP ${res.statusCode}`);
                    resolve();
                }).on('error', reject).on('timeout', () => {
                    reject(new Error('连接超时'));
                });
            });
        } catch (error) {
            console.log(`   ❌ 网络连接失败: ${error.message}`);
        }
        
        // 4. 执行刷新测试
        const testResult = await this.runImmediateTest();
        
        return testResult;
    }

    async runContinuousTest(minutes = 5) {
        console.log(`\n⏱️ 开始连续测试 (${minutes}分钟)...`);
        
        const endTime = Date.now() + (minutes * 60 * 1000);
        let testCount = 0;
        let successCount = 0;
        
        while (Date.now() < endTime) {
            testCount++;
            const currentTime = new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'});
            
            console.log(`\n🔄 第${testCount}次测试 - ${currentTime}`);
            
            try {
                const result = await this.runImmediateTest();
                if (result.success) {
                    successCount++;
                    console.log('✅ 本次测试成功');
                } else {
                    console.log('❌ 本次测试失败');
                }
            } catch (error) {
                console.log('❌ 本次测试出错:', error.message);
            }
            
            console.log(`📊 成功率: ${successCount}/${testCount} (${(successCount/testCount*100).toFixed(1)}%)`);
            
            // 等待1分钟
            if (Date.now() < endTime) {
                console.log('⏳ 等待60秒...');
                await this.sleep(60000);
            }
        }
        
        console.log(`\n🏁 连续测试完成: ${successCount}/${testCount} 成功`);
        return { total: testCount, success: successCount };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    printSummary(result) {
        const endTime = new Date();
        const duration = (endTime - this.startTime) / 1000;
        
        console.log('\n' + '='.repeat(60));
        console.log('🎊 Ubuntu测试完成汇总');
        console.log('='.repeat(60));
        console.log(`开始时间: ${this.startTime.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
        console.log(`结束时间: ${endTime.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
        console.log(`总计耗时: ${duration.toFixed(2)}秒`);
        console.log(`测试结果: ${result.success ? '✅ 成功' : '❌ 失败'}`);
        
        if (result.pointsInfo) {
            console.log(`积分状态: ${result.pointsInfo.formatted}`);
        }
        
        console.log('='.repeat(60));
        
        if (result.success) {
            console.log('🎉 恭喜！系统运行正常，可以部署到生产环境');
        } else {
            console.log('⚠️  系统存在问题，请检查配置和网络连接');
        }
    }
}

// 主程序入口
async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || 'single';
    
    const tester = new UbuntuTestRunner();
    let result;
    
    try {
        switch (mode) {
            case 'single':
                console.log('🎯 单次测试模式');
                result = await tester.runImmediateTest();
                break;
                
            case 'diagnostic':
                console.log('🔍 完整诊断模式');
                result = await tester.runFullDiagnostic();
                break;
                
            case 'continuous':
                const minutes = parseInt(args[1]) || 5;
                console.log(`⏱️ 连续测试模式 (${minutes}分钟)`);
                result = await tester.runContinuousTest(minutes);
                break;
                
            default:
                console.log('❓ 未知模式，使用单次测试');
                result = await tester.runImmediateTest();
        }
        
        tester.printSummary(result);
        process.exit(result.success ? 0 : 1);
        
    } catch (error) {
        console.error('\n💥 测试脚本执行失败!');
        console.error('错误信息:', error.message);
        console.error('错误堆栈:', error.stack);
        
        tester.printSummary({ success: false, error: error.message });
        process.exit(1);
    }
}

if (require.main === module) {
    console.log('使用方法:');
    console.log('  node test-ubuntu.js single      # 单次测试 (默认)');
    console.log('  node test-ubuntu.js diagnostic  # 完整诊断');
    console.log('  node test-ubuntu.js continuous [分钟] # 连续测试');
    console.log('');
    
    main();
}

module.exports = UbuntuTestRunner;