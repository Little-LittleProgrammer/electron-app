# 使用指南

## 📋 项目概述

这是一个完整的 Electron + Vue 3 + Vite 项目示例，实现了以下核心功能：

1. **环境自动检测**：自动识别浏览器和 Electron 环境
2. **智能路由守卫**：浏览器环境自动跳转到下载页面
3. **HTTP 代理**：通过 IPC 调用 Node.js 处理 HTTP 请求
4. **独立打包**：Web 项目可以独立部署到浏览器

## 🚀 快速开始

### 1. 安装依赖

```bash
# 在项目根目录
pnpm install
```

### 2. 开发模式

#### 方式一：仅运行 Web 项目（浏览器模式）

```bash
cd apps/web
pnpm dev
```

访问 http://localhost:3000，会自动跳转到下载页面。

#### 方式二：运行 Electron 应用（完整功能）

**步骤 1：启动 Web 开发服务器**

```bash
# 终端 1
cd apps/web
pnpm dev
```

**步骤 2：启动 Electron**

```bash
# 终端 2
cd apps/electron
pnpm dev
```

Electron 窗口会自动打开，可以访问所有功能。

### 3. 构建打包

#### 构建 Web 项目（用于浏览器部署）

```bash
cd apps/web
pnpm build
```

构建产物在 `apps/web/dist` 目录，可以部署到任何静态服务器。

#### 构建 Electron 应用

```bash
# 步骤 1：构建 Web 项目
cd apps/web
pnpm build

# 步骤 2：构建 Electron
cd ../electron
pnpm build

# 步骤 3：打包成安装包
pnpm compile
```

打包产物在 `apps/electron/release` 目录。

## 🎯 核心功能详解

### 1. 环境检测

项目自动检测运行环境，位于 `apps/web/src/utils/env.ts`：

```typescript
import { isElectron, isBrowser, getEnvironment } from '@/utils/env'

// 检测是否在 Electron 中
if (isElectron()) {
  console.log('在 Electron 环境中运行')
}

// 检测是否在浏览器中
if (isBrowser()) {
  console.log('在浏览器环境中运行')
}

// 获取环境类型
const env = getEnvironment() // 'electron' | 'browser'
```

### 2. HTTP 请求代理

在 `apps/web/src/utils/http.ts` 中封装了 HTTP 客户端：

```typescript
import { http } from '@/utils/http'

// GET 请求
const response = await http.get('https://api.github.com/users/github')

// POST 请求
const response = await http.post('https://api.example.com/data', {
  name: 'test',
  value: 123,
})

// 自定义请求
const response = await http.request({
  url: 'https://api.example.com/data',
  method: 'PUT',
  headers: { 'Authorization': 'Bearer token' },
  data: { key: 'value' },
})
```

**工作原理：**

- **浏览器环境**：使用 `fetch` API 直接发送请求
- **Electron 环境**：通过 IPC 调用主进程的 HTTP 服务，由 Node.js 发送请求

这样可以避免浏览器的跨域限制，并且可以使用 Node.js 的所有网络功能。

### 3. 路由配置

路由配置在 `apps/web/src/router/index.ts`：

```typescript
// 根据环境选择路由模式
const router = createRouter({
  history: isElectron() ? createWebHashHistory() : createWebHistory(),
  routes,
})

// 路由守卫：浏览器环境拦截非下载页面
router.beforeEach((to, from, next) => {
  if (!isElectron() && to.path !== '/download') {
    next('/download')
  } else {
    next()
  }
})
```

### 4. IPC 通信

#### Preload 脚本（`apps/electron/layers/preload/src/index.ts`）

```typescript
// 安全地暴露 API 到渲染进程
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

#### 主进程处理（`apps/electron/layers/main/src/index.ts`）

```typescript
// 注册 IPC 处理器
ipcMain.handle('http:request', async (event, config) => {
  const response = await httpService.request(config)
  return response
})

ipcMain.handle('system:getVersions', async () => {
  return {
    chrome: process.versions.chrome,
    node: process.versions.node,
    electron: process.versions.electron,
  }
})
```

## 📱 页面说明

### 1. 首页（Home.vue）

展示项目特性和欢迎信息，点击按钮进入功能演示。

### 2. 下载页面（Download.vue）

**仅在浏览器环境显示**，提供各平台的下载链接。

功能：
- 显示各平台下载按钮
- 展示应用特性
- 引导用户下载桌面应用

### 3. 功能演示页面（Demo.vue）

**仅在 Electron 环境可访问**，展示所有核心功能。

包含四个模块：

#### 3.1 HTTP 请求测试

- 支持所有 HTTP 方法（GET、POST、PUT、DELETE、PATCH）
- 自定义请求 URL、请求头、请求体
- 显示响应状态码、响应头、响应数据

#### 3.2 系统信息

- 显示运行环境（Electron 或浏览器）
- 显示 Electron 版本信息
- 显示平台和语言信息

#### 3.3 文件操作（仅 Electron）

- 选择并读取本地文件
- 写入内容到本地文件
- 支持多种文件格式

#### 3.4 系统通知

- 发送系统通知
- 自动请求通知权限
- 支持自定义标题和内容

## 🔧 配置说明

### Vite 配置（apps/web/vite.config.ts）

```typescript
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
})
```

### Electron Builder 配置（apps/electron/.electron-builder.config.js）

```javascript
module.exports = {
  appId: 'com.example.electron-vue-vite',
  productName: 'Electron Vue Vite Demo',
  directories: {
    output: 'release/${version}',
  },
  files: [
    'layers/main/dist/**/*',
    'layers/preload/dist/**/*',
    'package.json',
  ],
  extraResources: [
    {
      from: '../web/dist',
      to: 'renderer/dist',
    },
  ],
}
```

## 🔒 安全性

项目遵循 Electron 安全最佳实践：

1. ✅ **启用 contextIsolation**：隔离渲染进程和主进程的上下文
2. ✅ **禁用 nodeIntegration**：防止渲染进程直接访问 Node.js API
3. ✅ **使用 contextBridge**：安全地暴露 API 到渲染进程
4. ✅ **IPC 通信验证**：所有 IPC 调用都经过验证

## 📝 开发建议

### 1. 添加新的 IPC 功能

**步骤 1：在 Preload 脚本中声明 API**

```typescript
// apps/electron/layers/preload/src/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  // ... 现有 API
  newFeature: {
    doSomething: (params) => ipcRenderer.invoke('new:doSomething', params),
  },
})
```

**步骤 2：在主进程中注册处理器**

```typescript
// apps/electron/layers/main/src/index.ts
ipcMain.handle('new:doSomething', async (event, params) => {
  // 处理逻辑
  return result
})
```

**步骤 3：在渲染进程中使用**

```typescript
// 在 Vue 组件中
const electronAPI = getElectronAPI()
const result = await electronAPI.newFeature.doSomething(params)
```

### 2. 环境判断

在编写功能时，始终考虑环境差异：

```typescript
import { isElectron } from '@/utils/env'

if (isElectron()) {
  // Electron 特有功能
  const electronAPI = getElectronAPI()
  await electronAPI.file.selectAndRead()
} else {
  // 浏览器降级方案
  alert('此功能仅在桌面应用中可用')
}
```

### 3. 错误处理

始终添加错误处理：

```typescript
try {
  const response = await http.get('https://api.example.com/data')
  console.log(response.data)
} catch (error) {
  console.error('请求失败:', error.message)
  // 显示错误提示
}
```

## 🐛 常见问题

### 1. Electron 窗口打不开

**原因**：Web 开发服务器未启动

**解决**：
```bash
# 先启动 Web 服务器
cd apps/web
pnpm dev

# 再启动 Electron
cd ../electron
pnpm dev
```

### 2. HTTP 请求失败

**原因**：可能是 IPC 通信问题或网络问题

**检查**：
- 查看浏览器控制台和 Electron 主进程日志
- 确认请求 URL 是否正确
- 确认网络连接是否正常

### 3. 打包后无法访问页面

**原因**：资源路径配置问题

**解决**：
- 确保先构建 Web 项目
- 检查 `.electron-builder.config.js` 中的 `extraResources` 配置
- 检查主进程中的 `loadFile` 路径

### 4. 路由在 Electron 中不工作

**原因**：使用了错误的路由模式

**解决**：
确保使用 hash 模式：
```typescript
const router = createRouter({
  history: isElectron() ? createWebHashHistory() : createWebHistory(),
  routes,
})
```

## 📚 参考资料

- [Electron 官方文档](https://www.electronjs.org/docs/latest)
- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [Electron Builder 文档](https://www.electron.build/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

ISC

