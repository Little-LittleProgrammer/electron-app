# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中操作代码提供指导。

## 🚀 快速启动命令

### 开发
```bash
# 一键开发环境启动（启动 web 服务器 + electron）
bash scripts/dev.sh

# 或者分别启动：
pnpm dev:web              # 启动 web 开发服务器（端口 3000）
cd apps/electron && pnpm dev  # 启动 electron 应用（需要先运行 web 服务器）

# Turbo 开发（所有包）
pnpm dev
```

### 构建
```bash
# 构建所有应用和包
pnpm build

# 构建特定目标
pnpm build:web            # 构建 web 应用
pnpm build:electron       # 构建 electron 应用

# 完整构建 + 打包（生产环境）
bash scripts/build-all.sh

# 在 electron 目录下：
cd apps/electron && pnpm build && pnpm compile
```

### 代码质量
```bash
# 格式化代码
pnpm format

# 代码检查（oxlint + eslint）
pnpm lint

# 类型检查
cd apps/electron && pnpm typecheck
```

### 测试
```bash
# 运行测试
pnpm test

# 运行带覆盖率的测试
pnpm test:coverage
```

## 🏗️ 项目架构

这是一个使用 **Turborepo** 的 **monorepo**，结构如下：

```
electron-app/
├── apps/
│   ├── web/              # Vue 3 web 应用（可在浏览器中独立运行）
│   │   ├── src/
│   │   │   ├── views/       # 页面：Home、Download、Demo
│   │   │   ├── utils/       # env.ts（环境检测）、http.ts（HTTP 客户端）
│   │   │   ├── router/      # Vue Router 配置
│   │   │   ├── App.vue
│   │   │   └── main.ts
│   │   └── vite.config.ts
│   │
│   └── electron/         # Electron 桌面应用
│       └── layers/
│           ├── main/        # 主进程（index.ts）
│           │   ├── src/index.ts      # 窗口管理、IPC 处理器
│           │   └── src/services/     # HTTP 服务
│           └── preload/      # 预加载脚本（index.ts）
│               └── src/index.ts      # contextBridge API 暴露
│
├── packages/
│   ├── shared/           # 共享工具（@electron-app/shared）
│   │   └── src/
│   │       ├── env.ts         # 环境检测工具
│   │       │   ├── isElectron()
│   │       │   ├── isBrowser()
│   │       │   └── getElectronAPI()
│   │       └── index.ts
│   │
│   └── claude-agent/     # Claude agent SDK 集成
│
└── scripts/
    ├── dev.sh           # 一键开发环境启动
    └── build-all.sh     # 完整生产环境构建
```

## 🔑 核心架构细节

### 1. **环境检测**（`packages/shared/src/env.ts`）
   - 自动检测是否在 Electron 或浏览器环境中运行
   - 检查 `window.electronAPI` 或 `navigator.userAgent`
   - 使用 `isElectron()` 有条件地启用 Electron 特定功能

### 2. **HTTP 请求流程**
   - **浏览器**：直接使用 `fetch` API
   - **Electron**：通过 IPC 路由到主进程
     - Vue 组件 → `http.ts` → `electronAPI.http.request()` → Preload → IPC → 主进程 → Node.js HTTP 服务

### 3. **IPC 通信模式**
   ```
   主进程（apps/electron/layers/main/src/index.ts:109-173）
   ├── http:request       → HTTP 代理
   ├── system:getVersions → Chrome/Node/Electron 版本信息
   ├── file:selectAndRead → 文件选择和读取
   └── file:write         → 文件写入

   Preload（apps/electron/layers/preload/src/index.ts:8-41）
   └── contextBridge.exposeInMainWorld('electronAPI', {...})
   ```

### 4. **安全模型**
   - ✅ `contextIsolation: true` - 隔离上下文
   - ✅ `nodeIntegration: false` - 渲染进程中无直接 Node.js 访问
   - ✅ `contextBridge` - 安全的 API 暴露，带类型定义

### 5. **Monorepo 结构**
   - **Turborepo** 管理构建和依赖
   - **pnpm** 的工作区功能
   - **Catalog** 版本管理，中心化依赖管理
   - `@electron-app/shared` 提供 web 应用使用的环境检测工具

## 🔧 开发工作流

### 启动开发
1. **一键命令**：`bash scripts/dev.sh`（推荐）
   - 自动启动 web 服务器 + electron
   - Web 服务器运行在 http://localhost:3000

2. **手动**：
   ```bash
   # 终端 1
   cd apps/web && pnpm dev

   # 终端 2
   cd apps/electron && pnpm dev
   ```

### 修改代码
- **Web 应用变更**：通过 Vite 自动热重载
- **Electron 变更**：通过 `scripts/watch.js` 自动重启（监控 main/preload dist 文件）

### 路由
- **Electron**：使用哈希模式（`createWebHashHistory`）
- **浏览器**：使用历史模式（`createWebHistory`）
- 浏览器环境可以访问所有页面（无限制）

### 添加新的 IPC 处理器
1. **主进程**（`apps/electron/layers/main/src/index.ts`）：在 `registerIpcHandlers()` 中添加处理器
2. **Preload**（`apps/electron/layers/preload/src/index.ts`）：添加到 `contextBridge.exposeInMainWorld()`
3. **类型定义**：更新 `ElectronAPI` 接口
4. **Web 应用**：通过 `getElectronAPI()` 访问后调用 API

## 📦 构建配置

### Web 应用（`apps/web/vite.config.ts`）
- 基础路径：`./`（相对路径，用于 Electron 打包）
- 端口：3000
- 自动打开：true
- 别名：`@/` → `apps/web/src/`

### Electron（`apps/electron/.electron-builder.config.js`）
- 禁用 Asar：`--config.asar=false`
- 输出目录：`apps/electron/release/`

### 构建顺序
1. 首先构建 web 应用（`apps/web/dist`）
2. 构建 electron 层（`apps/electron/layers/*/dist`）
3. 用 electron-builder 打包

## 🎯 重要文件

- `apps/web/src/utils/env.ts` - 环境检测
- `apps/web/src/utils/http.ts` - 支持双模式的 HTTP 客户端
- `apps/web/src/router/index.ts` - 路由配置
- `apps/electron/layers/main/src/index.ts` - 主进程（窗口管理、IPC）
- `apps/electron/layers/preload/src/index.ts` - contextBridge API
- `packages/shared/src/env.ts` - 核心环境工具
- `scripts/dev.sh` - 开发环境启动器
- `scripts/build-all.sh` - 生产环境构建脚本

## 🔍 环境工具

使用 `@electron-app/shared` 中的这些工具：
```typescript
import { isElectron, isBrowser, getEnvironment, getElectronAPI } from '@electron-app/shared'

if (isElectron()) {
  // Electron 特定代码
  const api = getElectronAPI()
  api.http.request({...})
}
```

## 📚 其他文档

查看这些文件了解更多详情：
- `README.md` - 项目概述和特性
- `ARCHITECTURE.md` - 详细架构图
- `QUICKSTART.md` - 5 分钟快速入门指南
- `USAGE.md` - 使用示例和 API 文档
