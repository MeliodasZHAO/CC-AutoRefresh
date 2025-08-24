#!/usr/bin/env node

// 测试低积分阈值触发重置的情况

const fs = require('fs');

// 临时修改配置，将阈值设为20000（大于当前积分）
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const originalThreshold = config.automation.lowPointsThreshold;

config.automation.lowPointsThreshold = 20000; // 临时设为20000来触发重置条件
fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

console.log('🧪 测试模式：将积分阈值临时设为20000来触发重置条件');

// 运行测试
const { spawn } = require('child_process');
const test = spawn('node', ['src/main.js', '--test'], { stdio: 'inherit' });

test.on('close', (code) => {
    // 恢复原始配置
    config.automation.lowPointsThreshold = originalThreshold;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
    
    console.log(`\n🔧 已恢复积分阈值为: ${originalThreshold}`);
    console.log('测试完成！');
    process.exit(code);
});