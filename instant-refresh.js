#!/usr/bin/env node

/**
 * 立即刷新脚本 - 不进行任何检查，直接执行刷新
 * 专为紧急情况和测试使用
 */

const AutoRefresh = require('./src/main.js');

console.log('🚨 紧急刷新模式启动！');
console.log('⚡ 跳过所有检查，立即执行刷新操作');
console.log(`⏰ 执行时间: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
console.log('');

async function instantRefresh() {
    const startTime = new Date();
    
    try {
        console.log('🔧 初始化自动刷新系统...');
        const refresher = new AutoRefresh();
        
        // 强制设置为测试模式以避免发送邮件
        refresher.isTestMode = process.argv.includes('--no-email');
        
        console.log('⚡ 初始化框架...');
        await refresher.initFramework();
        
        console.log('🎯 开始执行刷新操作...');
        const result = await refresher.framework.execute();
        
        console.log('');
        console.log('=' * 50);
        console.log('🎊 刷新操作完成！');
        console.log('=' * 50);
        
        if (result && result.success) {
            console.log('✅ 状态: 成功');
            if (result.pointsInfo) {
                console.log(`📊 积分: ${result.pointsInfo.formatted} (${result.pointsInfo.percentage}%)`);
                console.log(`📈 详细: ${result.pointsInfo.current}/${result.pointsInfo.total}`);
            }
        } else {
            console.log('❌ 状态: 失败');
            if (result && result.error) {
                console.log(`🚫 错误: ${result.error}`);
            }
        }
        
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        console.log(`⏱️  耗时: ${duration.toFixed(2)}秒`);
        console.log('');
        
        // 清理资源
        if (refresher.framework && refresher.framework.cleanup) {
            console.log('🧹 清理资源...');
            await refresher.framework.cleanup();
        }
        
        console.log('✨ 立即刷新任务完成！');
        process.exit(result && result.success ? 0 : 1);
        
    } catch (error) {
        console.error('');
        console.error('💥 立即刷新失败！');
        console.error(`❌ 错误: ${error.message}`);
        console.error('📋 详细错误:');
        console.error(error.stack);
        console.error('');
        
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        console.error(`⏱️  失败前耗时: ${duration.toFixed(2)}秒`);
        console.error('');
        
        process.exit(1);
    }
}

// 显示使用说明
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('立即刷新脚本使用说明:');
    console.log('');
    console.log('基本用法:');
    console.log('  node instant-refresh.js              # 立即执行刷新');
    console.log('  node instant-refresh.js --no-email   # 执行刷新但不发送邮件');
    console.log('');
    console.log('特点:');
    console.log('  • 跳过时间检查和积分检查');
    console.log('  • 直接执行刷新操作');
    console.log('  • 适用于紧急情况和测试');
    console.log('  • 提供详细的执行反馈');
    console.log('');
    process.exit(0);
}

// 确认提示
if (!process.argv.includes('--yes')) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('⚠️  确定要立即执行刷新操作吗？(输入 y 确认): ', (answer) => {
        rl.close();
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            instantRefresh();
        } else {
            console.log('❌ 操作已取消');
            process.exit(0);
        }
    });
} else {
    // 如果有--yes参数，直接执行
    instantRefresh();
}