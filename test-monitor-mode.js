#!/usr/bin/env node

// 测试积分监控模式（2分钟演示）

const fs = require('fs');
const { spawn } = require('child_process');

// 临时修改配置，将检查间隔设为30秒
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const originalInterval = config.automation.checkInterval;

config.automation.checkInterval = 30000; // 30秒
fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

console.log('🧪 测试积分监控模式（30秒间隔，运行2分钟）');

// 运行监控模式
const monitor = spawn('node', ['src/main.js', '--mode=monitor'], { stdio: 'inherit' });

// 2分钟后停止测试
setTimeout(() => {
    console.log('\n⏹️ 测试结束，正在停止监控...');
    monitor.kill('SIGTERM');
    
    // 恢复原始配置
    config.automation.checkInterval = originalInterval;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
    
    console.log(`🔧 已恢复检查间隔为: ${originalInterval / 1000 / 60} 分钟`);
    console.log('积分监控测试完成！');
    process.exit(0);
}, 120000); // 2分钟

monitor.on('close', (code) => {
    // 恢复原始配置
    config.automation.checkInterval = originalInterval;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
    
    console.log(`\n🔧 已恢复检查间隔为: ${originalInterval / 1000 / 60} 分钟`);
    process.exit(code);
});