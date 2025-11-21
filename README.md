# Electron Vue Vite Demo

一个**生产就绪**的 Electron + Vue 3 + Vite 项目示例，支持 Web 和桌面应用双模式运行。

> 🎯 **完整功能 · 安全可靠 · 文档完善 · 开箱即用**

[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange.svg)](https://pnpm.io)

## ✨ 特性

- 🚀 **环境检测**：自动识别浏览器和 Electron 环境，提供不同的功能体验
- 🔗 **HTTP 代理**：通过 IPC 调用 Node.js 进行 HTTP 请求转发，避免跨域问题
- ⚡ **独立打包**：Web 项目可以单独打包部署到浏览器
- 🔒 **安全隔离**：使用 contextBridge 安全地暴露 API
- 🎨 **现代 UI**：美观的界面设计，优秀的用户体验

## 📦 项目结构

```
electron-vue-vite/
├── apps/
│   ├── web/                    # Web 项目（可独立运行）
│   │   ├── src/
│   │   │   ├── views/         # 页面组件
│   │   │   │   ├── Home.vue   # 首页
│   │   │   │   ├── Download.vue  # 下载页面（浏览器环境）
│   │   │   │   └── Demo.vue   # 功能演示页面
│   │   │   ├── utils/         # 工具函数
│   │   │   │   ├── env.ts     # 环境检测
│   │   │   │   └── http.ts    # HTTP 请求封装
│   │   │   ├── router/        # 路由配置
│   │   │   ├── App.vue        # 根组件
│   │   │   └── main.ts        # 入口文件
│   │   ├── vite.config.ts     # Vite 配置
│   │   └── package.json
│   │
│   └── electron/              # Electron 应用
│       ├── layers/
│       │   ├── main/          # 主进程
│       │   │   └── src/
│       │   │       ├── index.ts          # 主进程入口
│       │   │       └── services/
│       │   │           └── http.ts       # HTTP 服务
│       │   └── preload/       # 预加载脚本
│       │       └── src/
│       │           └── index.ts          # Preload 脚本
│       ├── scripts/
│       │   └── watch.js       # 开发模式监听脚本
│       ├── .electron-builder.config.js  # Electron Builder 配置
│       └── package.json
│
└── package.json               # 根配置
```

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

#### 1. 启动 Web 项目（浏览器模式）

```bash
cd apps/web
pnpm dev
```

访问 http://localhost:3000，将自动跳转到下载页面。

#### 2. 启动 Electron 应用

**首先启动 Web 开发服务器：**

```bash
cd apps/web
pnpm dev
```

**然后在另一个终端启动 Electron：**

```bash
cd apps/electron
pnpm dev
```

### 构建打包

#### 1. 构建 Web 项目

```bash
cd apps/web
pnpm build
```

构建产物在 `apps/web/dist` 目录。

#### 2. 构建 Electron 应用

```bash
# 先构建 Web 项目
cd apps/web
pnpm build

# 再构建 Electron
cd ../electron
pnpm build

# 打包应用
pnpm compile
```

## 🔧 核心功能

### 1. 环境检测

项目会自动检测当前运行环境：

- **浏览器环境**：只能访问下载页面，引导用户下载桌面应用
- **Electron 环境**：可以访问所有功能，包括 HTTP 请求、文件操作等

环境检测工具位于 `apps/web/src/utils/env.ts`。

### 2. HTTP 代理

在 Electron 环境中，HTTP 请求通过 IPC 转发到主进程，由 Node.js 发起请求：

```typescript
// 使用示例
import { http } from '@/utils/http'

const response = await http.get('https://api.github.com/users/github')
console.log(response.data)
```

- **浏览器环境**：使用 `fetch` API
- **Electron 环境**：通过 IPC 调用主进程的 HTTP 服务

### 3. 路由守卫

路由配置了守卫，自动根据环境跳转：

```typescript
router.beforeEach((to, from, next) => {
  // 浏览器环境下，非下载页面自动跳转
  if (!isElectron() && to.path !== '/download') {
    next('/download')
  } else {
    next()
  }
})
```

### 4. IPC 通信

通过 `contextBridge` 安全地暴露 API：

```typescript
// Preload 脚本
contextBridge.exposeInMainWorld('electronAPI', {
  http: {
    request: (config) => ipcRenderer.invoke('http:request', config),
  },
  system: {
    getVersions: () => ipcRenderer.invoke('system:getVersions'),
  },
  file: {
    selectAndRead: () => ipcRenderer.invoke('file:selectAndRead'),
    write: (content) => ipcRenderer.invoke('file:write', content),
  },
})
```

## 📱 功能演示

### HTTP 请求测试

- 支持 GET、POST、PUT、DELETE、PATCH 等方法
- 自定义请求头和请求体
- 显示响应状态和数据

### 系统信息

- 显示运行环境
- 显示 Electron 版本信息（仅 Electron 环境）
- 显示平台和语言信息

### 文件操作（仅 Electron）

- 选择并读取文件
- 写入文件到本地

### 系统通知

- 发送系统通知
- 自动请求通知权限

## 🛠️ 技术栈

- **前端框架**：Vue 3
- **构建工具**：Vite
- **路由**：Vue Router
- **状态管理**：Pinia
- **桌面框架**：Electron
- **包管理**：pnpm
- **Monorepo**：Turborepo

## 📝 开发注意事项

### 1. 环境判断

在开发功能时，注意判断当前环境：

```typescript
import { isElectron } from '@/utils/env'

if (isElectron()) {
  // Electron 环境特有功能
} else {
  // 浏览器环境
}
```

### 2. 路由模式

- **Electron 环境**：使用 hash 模式（`createWebHashHistory`）
- **浏览器环境**：使用 history 模式（`createWebHistory`）

### 3. 构建顺序

打包 Electron 应用时，必须先构建 Web 项目：

```bash
cd apps/web && pnpm build
cd ../electron && pnpm build && pnpm compile
```

### 4. 开发服务器

Electron 开发模式需要先启动 Web 开发服务器（端口 3000），然后再启动 Electron。

## 🔒 安全性

- ✅ 启用了 `contextIsolation`
- ✅ 禁用了 `nodeIntegration`
- ✅ 使用 `contextBridge` 暴露 API
- ✅ 所有 IPC 通信都经过验证

## 📄 License

ISC

## 📖 更多文档

- 📘 [项目介绍](./PROJECT_INTRO.md) - 项目概述和特色功能
- 🚀 [快速开始](./QUICKSTART.md) - 5 分钟上手指南
- 📖 [使用指南](./USAGE.md) - 详细的功能说明和 API 文档
- 🏗️ [架构文档](./ARCHITECTURE.md) - 系统架构和设计原理
- 📊 [项目总结](./PROJECT_SUMMARY.md) - 完整功能清单
- ✅ [检查清单](./CHECKLIST.md) - 功能测试和验证清单

## 🎯 核心优势

### 🚀 生产级质量
- 完整的功能实现，不是玩具项目
- TypeScript 全覆盖，类型安全
- 遵循最佳实践，代码质量高

### 📚 文档完善
- 7 个详细文档，覆盖所有方面
- 清晰的代码注释
- 从入门到精通的学习路径

### 🔒 安全可靠
- 遵循 Electron 安全最佳实践
- contextIsolation + contextBridge
- 完整的错误处理机制

### 💻 开发友好
- 一键启动脚本
- 自动重启和热更新
- 清晰的项目结构

## 🌟 适用场景

- ✅ 企业内部工具开发
- ✅ 跨平台桌面应用
- ✅ 混合部署项目（Web + 桌面）
- ✅ Electron 学习和参考
- ✅ Vue 3 + Vite 实践

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

