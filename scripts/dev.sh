#!/bin/bash

# Electron 开发模式启动脚本
# 自动启动 Web 开发服务器和 Electron 应用

echo "=========================================="
echo "  启动 Electron 开发环境"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 检测到未安装依赖，开始安装..."
    pnpm install
    echo ""
fi

# 启动 Web 开发服务器（后台运行）
echo "🚀 启动 Web 开发服务器..."
cd apps/web
pnpm dev > /dev/null 2>&1 &
WEB_PID=$!
cd ../..
echo "✅ Web 开发服务器已启动 (PID: $WEB_PID)"

# 等待 Web 服务器启动
echo "⏳ 等待 Web 服务器就绪..."
sleep 5

# 启动 Electron
echo "🚀 启动 Electron 应用..."
cd apps/electron
pnpm dev

# 清理：Electron 退出后，关闭 Web 服务器
echo ""
echo "🧹 清理进程..."
kill $WEB_PID 2>/dev/null
echo "✅ 已关闭 Web 开发服务器"
echo ""
echo "👋 再见！"

