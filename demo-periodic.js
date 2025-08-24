#!/usr/bin/env node

// 演示定期检查功能（1分钟间隔，运行3次）

const fs = require('fs');

// 临时修改配置，将检查间隔设为1分钟用于演示
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const originalInterval = config.automation.checkInterval;

config.automation.checkInterval = 60000; // 1分钟
fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

console.log('🧪 演示模式：将检查间隔临时设为1分钟');
console.log('注意：此演示会运行约3分钟，然后自动退出');

// 运行演示
const { spawn } = require('child_process');
const demo = spawn('node', ['src/main.js'], { stdio: 'inherit' });

// 3分钟后停止演示
setTimeout(() => {
    console.log('\n⏹️ 演示结束，正在停止...');
    demo.kill('SIGTERM');
    
    // 恢复原始配置
    config.automation.checkInterval = originalInterval;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
    
    console.log(`🔧 已恢复检查间隔为: ${originalInterval / 1000 / 60} 分钟`);
    console.log('演示完成！');
    process.exit(0);
}, 180000); // 3分钟

demo.on('close', (code) => {
    // 恢复原始配置
    config.automation.checkInterval = originalInterval;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
    
    console.log(`\n🔧 已恢复检查间隔为: ${originalInterval / 1000 / 60} 分钟`);
    process.exit(code);
});