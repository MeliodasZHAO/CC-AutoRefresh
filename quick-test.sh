#!/bin/bash

# Ubuntu快速测试脚本 - 立即执行
# 使用方法: chmod +x quick-test.sh && ./quick-test.sh

echo "🔥 Ubuntu服务器快速测试启动！"
echo "⏰ 当前时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "🌐 服务器信息: $(uname -a)"
echo ""

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"
echo "✅ NPM版本: $(npm --version)"
echo ""

# 检查项目文件
if [ ! -f "package.json" ]; then
    echo "❌ 未找到package.json，请确保在项目根目录执行"
    exit 1
fi

if [ ! -f "config.json" ]; then
    echo "❌ 未找到config.json，请确保配置文件存在"
    exit 1
fi

if [ ! -f "test-ubuntu.js" ]; then
    echo "❌ 未找到test-ubuntu.js，请确保测试文件存在"  
    exit 1
fi

echo "✅ 项目文件检查完成"
echo ""

# 安装依赖(如果需要)
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
    echo ""
fi

echo "🚀 开始执行测试..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查参数
TEST_MODE=${1:-"single"}

case $TEST_MODE in
    "single")
        echo "🎯 执行单次测试..."
        node test-ubuntu.js single
        ;;
    "diagnostic")  
        echo "🔍 执行完整诊断..."
        node test-ubuntu.js diagnostic
        ;;
    "continuous")
        MINUTES=${2:-5}
        echo "⏱️ 执行连续测试 (${MINUTES}分钟)..."
        node test-ubuntu.js continuous $MINUTES
        ;;
    "force")
        echo "💪 强制立即刷新..."
        node src/main.js --test
        ;;
    *)
        echo "❓ 未知参数: $TEST_MODE"
        echo ""
        echo "使用方法:"
        echo "  ./quick-test.sh single      # 单次测试 (默认)"
        echo "  ./quick-test.sh diagnostic  # 完整诊断"
        echo "  ./quick-test.sh continuous [分钟] # 连续测试"
        echo "  ./quick-test.sh force       # 强制刷新"
        exit 1
        ;;
esac

TEST_RESULT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TEST_RESULT -eq 0 ]; then
    echo "🎉 测试完成！系统运行正常"
    echo "✅ 可以安全部署到生产环境"
else
    echo "⚠️  测试失败！请检查配置和网络"
    echo "❌ 建议先修复问题再部署"
fi

echo "⏰ 测试结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

exit $TEST_RESULT