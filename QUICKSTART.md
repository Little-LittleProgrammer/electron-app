# 🚀 快速开始

## 📋 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## 📦 安装

```bash
# 克隆项目（如果需要）
git clone <your-repo-url>
cd electron-vue-vite

# 安装依赖
pnpm install
```

## 🎯 运行项目

### 方式一：只运行 Web 项目（浏览器）

```bash
pnpm dev:web
```

访问 http://localhost:3000，会看到下载页面。

### 方式二：运行完整的 Electron 应用（推荐）

```bash
pnpm dev:electron
```

这个命令会自动：
1. 启动 Web 开发服务器
2. 等待服务器就绪
3. 启动 Electron 应用
4. 退出时自动清理所有进程

### 方式三：手动启动（更灵活）

**终端 1 - 启动 Web 服务器：**
```bash
cd apps/web
pnpm dev
```

**终端 2 - 启动 Electron：**
```bash
cd apps/electron
pnpm dev
```

## 🏗️ 构建项目

### 快速构建（推荐）

```bash
pnpm build:all
```

这个命令会自动：
1. 构建 Web 项目
2. 构建 Electron 主进程和预加载脚本
3. 打包成安装包

### 分步构建

```bash
# 1. 只构建 Web 项目
pnpm build:web

# 2. 只构建 Electron
pnpm build:electron

# 3. 打包应用（需要先完成 1 和 2）
cd apps/electron
pnpm compile
```

## 📁 产物位置

- **Web 构建产物**：`apps/web/dist/`
- **Electron 构建产物**：`apps/electron/layers/{main,preload}/dist/`
- **安装包**：`apps/electron/release/`

## 🎨 项目特性演示

启动 Electron 应用后，可以体验以下功能：

1. **HTTP 请求测试**
   - 测试各种 HTTP 方法
   - 查看请求和响应详情
   - 通过 IPC 代理避免跨域

2. **系统信息**
   - 查看运行环境
   - 查看 Electron 版本
   - 查看系统平台信息

3. **文件操作**
   - 选择并读取本地文件
   - 写入内容到本地文件

4. **系统通知**
   - 发送自定义通知
   - 测试通知权限

## 🔍 验证环境检测

### 浏览器环境

1. 启动 Web 项目：`pnpm dev:web`
2. 访问 http://localhost:3000
3. 应该自动跳转到下载页面
4. 尝试访问 http://localhost:3000/#/demo 会被拦截

### Electron 环境

1. 启动 Electron：`pnpm dev:electron`
2. 应该直接进入首页
3. 可以正常访问所有功能页面
4. HTTP 请求通过 Node.js 代理

## 📝 常用命令

```bash
# 开发
pnpm dev:web              # 浏览器开发模式
pnpm dev:electron         # Electron 开发模式（推荐）

# 构建
pnpm build:web            # 构建 Web 项目
pnpm build:electron       # 构建 Electron
pnpm build:all            # 完整构建并打包

# 其他
pnpm format               # 格式化代码
pnpm lint                 # 代码检查
```

## 🐛 常见问题

### 1. 端口被占用

```bash
# 查找占用端口的进程
lsof -i:3000

# 杀死进程
kill -9 <PID>
```

### 2. pnpm 命令不存在

```bash
# 安装 pnpm
npm install -g pnpm
```

### 3. Electron 窗口空白

- 确保 Web 开发服务器已启动
- 检查控制台是否有错误
- 尝试刷新：Cmd/Ctrl + R

### 4. 依赖安装失败

```bash
# 清理缓存重新安装
rm -rf node_modules
rm -rf apps/*/node_modules
pnpm store prune
pnpm install
```

## 📚 下一步

- 查看 [README.md](./README.md) 了解项目详情
- 查看 [USAGE.md](./USAGE.md) 了解详细使用指南
- 查看代码注释了解实现细节

## 💡 提示

- 开发时推荐使用 `pnpm dev:electron` 一键启动
- 修改代码后 Electron 会自动重启
- Web 项目支持热更新
- 可以打开开发者工具调试：Cmd/Ctrl + Shift + I

## 🤝 需要帮助？

如果遇到问题，请：
1. 检查 [常见问题](#-常见问题) 部分
2. 查看详细文档 [USAGE.md](./USAGE.md)
3. 提交 Issue

祝使用愉快！🎉

