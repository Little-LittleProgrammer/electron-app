# 🏗️ 项目架构

## 📐 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                       Electron App                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   渲染进程 (Web)                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Vue 3     │  │  Vue Router  │  │   Pinia     │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │            环境检测 (env.ts)                     │  │  │
│  │  │  - isElectron()                                  │  │  │
│  │  │  - isBrowser()                                   │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                         ↓                              │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │          HTTP 客户端 (http.ts)                   │  │  │
│  │  │  - Electron: 通过 IPC                            │  │  │
│  │  │  - Browser: 使用 fetch                           │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↕                                │
│                    contextBridge API                        │
│                            ↕                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               预加载脚本 (Preload)                     │  │
│  │  - 安全暴露 IPC API                                    │  │
│  │  - contextBridge.exposeInMainWorld()                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↕                                │
│                         IPC 通信                            │
│                            ↕                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  主进程 (Main)                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  窗口管理                                        │  │  │
│  │  │  - createWindow()                               │  │  │
│  │  │  - 生命周期管理                                  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  IPC 处理器                                      │  │  │
│  │  │  - http:request                                 │  │  │
│  │  │  - system:getVersions                           │  │  │
│  │  │  - file:selectAndRead                           │  │  │
│  │  │  - file:write                                   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  HTTP 服务 (http.ts)                            │  │  │
│  │  │  - Node.js http/https 模块                      │  │  │
│  │  │  - 避免跨域限制                                  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

                           OR

┌─────────────────────────────────────────────────────────────┐
│                    Browser (Web Only)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Vue 3 App                            │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Vue 3     │  │  Vue Router  │  │   Pinia     │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │        路由守卫 - 跳转到下载页面                  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │          下载页面 (Download.vue)                  │  │  │
│  │  │  - 展示下载链接                                   │  │  │
│  │  │  - 引导用户下载桌面应用                           │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 数据流

### 1. HTTP 请求流程（Electron 环境）

```
┌─────────────┐     1. 调用     ┌─────────────┐
│  Vue 组件   │ ─────────────→ │  http.ts    │
└─────────────┘                 └─────────────┘
                                      │
                                      │ 2. 检测环境
                                      │ (isElectron)
                                      ↓
                          ┌──────────────────────┐
                          │  electronAPI.http    │
                          └──────────────────────┘
                                      │
                                      │ 3. IPC 调用
                                      │ (invoke)
                                      ↓
                          ┌──────────────────────┐
                          │  Preload Bridge      │
                          └──────────────────────┘
                                      │
                                      │ 4. IPC 传递
                                      ↓
                          ┌──────────────────────┐
                          │  Main Process        │
                          │  (IPC Handler)       │
                          └──────────────────────┘
                                      │
                                      │ 5. HTTP 服务
                                      ↓
                          ┌──────────────────────┐
                          │  httpService.request │
                          │  (Node.js)           │
                          └──────────────────────┘
                                      │
                                      │ 6. 网络请求
                                      ↓
                          ┌──────────────────────┐
                          │   远程 API 服务器     │
                          └──────────────────────┘
                                      │
                                      │ 7. 响应返回
                                      │ (原路返回)
                                      ↓
                          ┌──────────────────────┐
                          │     Vue 组件         │
                          │   (显示结果)         │
                          └──────────────────────┘
```

### 2. HTTP 请求流程（浏览器环境）

```
┌─────────────┐     1. 调用     ┌─────────────┐
│  Vue 组件   │ ─────────────→ │  http.ts    │
└─────────────┘                 └─────────────┘
                                      │
                                      │ 2. 检测环境
                                      │ (!isElectron)
                                      ↓
                          ┌──────────────────────┐
                          │   fetch API          │
                          └──────────────────────┘
                                      │
                                      │ 3. 浏览器请求
                                      ↓
                          ┌──────────────────────┐
                          │   远程 API 服务器     │
                          └──────────────────────┘
                                      │
                                      │ 4. 响应返回
                                      ↓
                          ┌──────────────────────┐
                          │     Vue 组件         │
                          │   (显示结果)         │
                          └──────────────────────┘
```

### 3. 路由守卫流程

```
┌──────────────┐
│ 用户访问页面  │
└──────────────┘
       │
       │ 1. 路由跳转
       ↓
┌──────────────────────┐
│  router.beforeEach   │
└──────────────────────┘
       │
       │ 2. 检测环境
       ↓
┌──────────────────────┐
│   isElectron()?      │
└──────────────────────┘
       │
       ├─── YES ──→ 允许访问所有页面
       │
       └─── NO ───→ 强制跳转到 /download
```

## 📦 模块职责

### 渲染进程（Web）

#### 1. 环境检测模块 (`src/utils/env.ts`)

**职责：**
- 检测当前运行环境（Electron 或浏览器）
- 提供环境相关的工具函数
- 获取 Electron API 引用

**关键函数：**
```typescript
isElectron(): boolean          // 是否在 Electron 中
isBrowser(): boolean           // 是否在浏览器中
getEnvironment(): string       // 获取环境类型
getElectronAPI(): ElectronAPI  // 获取 Electron API
```

#### 2. HTTP 客户端模块 (`src/utils/http.ts`)

**职责：**
- 统一封装 HTTP 请求
- 根据环境选择请求方式
- 处理请求和响应

**特性：**
- Electron 环境：IPC 代理
- 浏览器环境：fetch API
- 支持所有 HTTP 方法
- 支持请求/响应拦截

#### 3. 路由模块 (`src/router/index.ts`)

**职责：**
- 管理页面路由
- 实现路由守卫
- 根据环境选择路由模式

**特性：**
- Electron：hash 模式
- Browser：history 模式
- 自动拦截浏览器访问

#### 4. 页面组件

- **Home.vue**: 首页，展示项目特性
- **Download.vue**: 下载页面（浏览器专用）
- **Demo.vue**: 功能演示页面（Electron 专用）

### 预加载脚本（Preload）

**文件：** `apps/electron/layers/preload/src/index.ts`

**职责：**
- 安全暴露 API 到渲染进程
- 桥接渲染进程和主进程
- 使用 contextBridge 隔离上下文

**暴露的 API：**
```typescript
interface ElectronAPI {
  http: {
    request: (config: any) => Promise<any>
  }
  system: {
    getVersions: () => Promise<Versions>
  }
  file: {
    selectAndRead: () => Promise<string | null>
    write: (content: string) => Promise<boolean>
  }
}
```

### 主进程（Main）

**文件：** `apps/electron/layers/main/src/index.ts`

**职责：**
- 管理应用生命周期
- 创建和管理窗口
- 注册 IPC 处理器
- 提供系统级功能

**IPC 处理器：**
- `http:request`: HTTP 请求代理
- `system:getVersions`: 获取版本信息
- `file:selectAndRead`: 文件选择和读取
- `file:write`: 文件写入

#### HTTP 服务 (`src/services/http.ts`)

**职责：**
- 使用 Node.js 发送 HTTP 请求
- 避免浏览器跨域限制
- 支持所有 HTTP 方法

## 🔐 安全架构

### 安全措施

1. **上下文隔离**
   ```typescript
   webPreferences: {
     contextIsolation: true,  // ✅ 启用
     nodeIntegration: false,  // ✅ 禁用
   }
   ```

2. **安全桥接**
   ```typescript
   // 使用 contextBridge 而不是直接暴露
   contextBridge.exposeInMainWorld('electronAPI', { ... })
   ```

3. **IPC 验证**
   ```typescript
   // 主进程验证所有 IPC 请求
   ipcMain.handle('http:request', async (event, config) => {
     // 验证和处理
   })
   ```

4. **最小权限原则**
   - 只暴露必要的 API
   - 不暴露敏感的 Node.js 模块
   - 限制文件系统访问

## 🎨 构建流程

### 开发模式

```
┌──────────────┐
│  启动 Web    │
│  开发服务器  │ (vite dev)
│  Port: 3000  │
└──────────────┘
       │
       │ 监听变化
       ↓
┌──────────────┐
│  热更新      │
│  HMR         │
└──────────────┘

┌──────────────┐
│ 构建 Main    │ (vite build --watch)
└──────────────┘
       │
       │ 文件变化
       ↓
┌──────────────┐
│ 重启 Electron│
└──────────────┘

┌──────────────┐
│构建 Preload  │ (vite build --watch)
└──────────────┘
       │
       │ 文件变化
       ↓
┌──────────────┐
│ 重启 Electron│
└──────────────┘
```

### 生产构建

```
1. 构建 Web 项目
   ├─ vite build
   └─ 输出到 dist/

2. 构建 Electron Main
   ├─ vite build
   └─ 输出到 layers/main/dist/

3. 构建 Electron Preload
   ├─ vite build
   └─ 输出到 layers/preload/dist/

4. 打包应用
   ├─ electron-builder
   ├─ 复制 Web dist
   └─ 生成安装包
```

## 📊 目录映射

```
开发时：
- Web: http://localhost:3000
- Main: layers/main/src/
- Preload: layers/preload/src/

构建后：
- Web: apps/web/dist/
- Main: apps/electron/layers/main/dist/index.cjs
- Preload: apps/electron/layers/preload/dist/index.cjs

打包后：
- 应用内: resources/app.asar
  ├─ renderer/dist/ (Web)
  ├─ layers/main/dist/
  └─ layers/preload/dist/
```

## 🔌 扩展点

### 添加新的 IPC 功能

1. **在 Preload 中声明：**
   ```typescript
   // layers/preload/src/index.ts
   contextBridge.exposeInMainWorld('electronAPI', {
     newFeature: {
       method: (params) => ipcRenderer.invoke('new:method', params)
     }
   })
   ```

2. **在 Main 中实现：**
   ```typescript
   // layers/main/src/index.ts
   ipcMain.handle('new:method', async (event, params) => {
     // 实现逻辑
     return result
   })
   ```

3. **在 Web 中使用：**
   ```typescript
   // apps/web/src/
   const api = getElectronAPI()
   const result = await api.newFeature.method(params)
   ```

### 添加新的服务

在 `apps/electron/layers/main/src/services/` 下创建新服务：

```typescript
// new-service.ts
class NewService {
  async doSomething() {
    // 实现
  }
}

export const newService = new NewService()
```

## 📝 设计决策

### 为什么使用 IPC 代理 HTTP？

- ✅ 避免浏览器 CORS 限制
- ✅ 使用 Node.js 全部网络功能
- ✅ 可以添加请求日志、缓存等
- ✅ 更好的错误处理

### 为什么使用路由守卫？

- ✅ 确保浏览器用户不会看到不可用的功能
- ✅ 提供清晰的用户引导
- ✅ 避免运行时错误

### 为什么分离 Web 和 Electron？

- ✅ Web 可以独立部署
- ✅ 更好的代码组织
- ✅ 独立的构建流程
- ✅ 便于维护和测试

## 🎯 最佳实践

1. **始终检查环境**
   ```typescript
   if (isElectron()) {
     // Electron 功能
   } else {
     // 浏览器降级方案
   }
   ```

2. **错误处理**
   ```typescript
   try {
     await electronAPI.someMethod()
   } catch (error) {
     // 友好的错误提示
   }
   ```

3. **类型安全**
   - 为 IPC 调用定义接口
   - 使用 TypeScript 类型检查
   - 验证参数

4. **安全第一**
   - 不暴露敏感 API
   - 验证所有输入
   - 最小权限原则

