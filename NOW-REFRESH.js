#!/usr/bin/env node

/**
 * 立即刷新 - 现在就执行重置积分！
 */

const AutoRefresh = require('./src/main.js');

console.log('🔥🔥🔥 立即重置积分！！！');
console.log(`⏰ ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
console.log('');

async function RESET_NOW() {
    try {
        console.log('⚡ 启动中...');
        const refresher = new AutoRefresh();
        
        console.log('⚡ 初始化框架...');
        await refresher.initFramework();
        
        console.log('⚡ 执行强制重置操作...');
        const result = await refresher.framework.executeForceReset();
        
        console.log('');
        if (result && result.success) {
            console.log('🎉🎉🎉 重置成功！！！');
            if (result.pointsInfo) {
                console.log(`📊 积分已重置到: ${result.pointsInfo.formatted}`);
            }
        } else {
            console.log('❌❌❌ 重置失败！！！');
        }
        
        if (refresher.framework && refresher.framework.cleanup) {
            await refresher.framework.cleanup();
        }
        
        process.exit(result && result.success ? 0 : 1);
        
    } catch (error) {
        console.error('💥💥💥 执行失败:', error.message);
        process.exit(1);
    }
}

RESET_NOW();