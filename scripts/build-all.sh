#!/bin/bash

# 完整构建脚本
# 构建 Web 项目和 Electron 应用

echo "=========================================="
echo "  完整构建 Electron 应用"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 步骤 1：构建 Web 项目
echo "📦 步骤 1/3：构建 Web 项目..."
cd apps/web
pnpm build
if [ $? -ne 0 ]; then
    echo "❌ Web 项目构建失败"
    exit 1
fi
echo "✅ Web 项目构建成功"
echo ""

# 步骤 2：构建 Electron 主进程和预加载脚本
echo "📦 步骤 2/3：构建 Electron..."
cd ../electron
pnpm build
if [ $? -ne 0 ]; then
    echo "❌ Electron 构建失败"
    exit 1
fi
echo "✅ Electron 构建成功"
echo ""

# 步骤 3：打包应用
echo "📦 步骤 3/3：打包应用..."
pnpm compile
if [ $? -ne 0 ]; then
    echo "❌ 应用打包失败"
    exit 1
fi
echo "✅ 应用打包成功"
echo ""

echo "=========================================="
echo "  ✅ 构建完成！"
echo "=========================================="
echo ""
echo "📁 打包产物位置："
echo "   apps/electron/release/"
echo ""

