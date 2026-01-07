# Electron Vue Vite 项目知识文档

## 📋 项目概述

这是一个**生产就绪**的 Electron + Vue 3 + Vite 项目示例，支持 Web 和桌面应用双模式运行。项目采用现代化的 Monorepo 架构，集成了 Claude AI Agent、MCP (Model Context Protocol) 等先进功能。

### 🎯 核心特性
- **双模式运行**: 支持浏览器和 Electron 桌面环境
- **环境自适应**: 自动检测运行环境并提供不同功能体验
- **HTTP 代理**: 通过 IPC 调用 Node.js 进行 HTTP 请求转发，避免跨域问题
- **AI 集成**: 内置 Claude Agent，支持 AI 辅助开发
- **MCP 支持**: 支持 Model Context Protocol 扩展
- **安全可靠**: 遵循 Electron 安全最佳实践

## 🏗️ 项目架构

### Monorepo 结构
```
electron-vue-vite/
├── apps/                    # 应用目录
│   ├── web/                # Web 应用（可独立运行）
│   └── electron/           # Electron 应用
│       └── layers/
│           ├── main/       # 主进程
│           └── preload/    # 预加载脚本
├── packages/               # 共享包
│   ├── claude-agent/      # Claude Agent SDK
│   ├── shared/            # 共享工具和类型
│   ├── electron-core/     # Electron 核心（待实现）
│   └── ui/                # UI 组件（待实现）
└── docs/                  # 项目文档
```

### 技术栈
- **前端框架**: Vue 3.5.18 + TypeScript
- **构建工具**: Vite 7.1.1
- **桌面框架**: Electron 39.2.2
- **路由**: Vue Router 4.5.1
- **状态管理**: Pinia 3.0.3
- **UI 组件**: Ant Design Vue 4.2.6 + Tailwind CSS 3.4.17
- **包管理**: pnpm 10.15.1
- **Monorepo**: Turborepo 2.5.5
- **AI 集成**: @anthropic-ai/claude-agent-sdk

## 🔄 核心业务流程

### 1. 环境检测与适配
项目通过 `packages/shared/src/env.ts` 实现环境检测：

```typescript
// 环境检测关键函数
export const isElectron = (): boolean => {
    // 检查 window.electronAPI 是否存在（由 preload 脚本注入）
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return true;
    }
    // 检查 userAgent
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('electron')) {
        return true;
    }
    return false;
};
```

**环境适配策略**:
- **Electron 环境**: 完整功能访问，包括 HTTP 代理、文件操作、AI Agent 等
- **浏览器环境**: 限制功能访问，显示下载页面引导用户下载桌面应用

### 2. HTTP 请求流程
项目实现了环境自适应的 HTTP 请求机制：

#### Electron 环境流程
```
Vue 组件 → http.ts → electronAPI.http.request → IPC → 主进程 → Node.js fetch → 远程API
```

#### 浏览器环境流程
```
Vue 组件 → http.ts → fetch API → 远程API
```

关键实现位于 `apps/web/src/utils/http.ts`:
- 支持拦截器模式
- 环境自适应请求
- 完整的错误处理

### 3. 路由守卫机制
路由配置位于 `apps/web/src/router/index.ts`：

```typescript
// Electron 环境使用 hash 模式，浏览器环境使用 history 模式
const router = createRouter({
    history: isElectron() ? createWebHashHistory() : createWebHistory(),
    routes,
});

// 路由守卫（当前被注释）
// router.beforeEach((to, from, next) => {
//     if (!isElectron() && to.path !== '/download') {
//         next('/download');
//     } else {
//         next();
//     }
// });
```

### 4. Claude AI Agent 集成
项目深度集成了 Claude Agent，支持 AI 辅助开发：

#### 服务架构
- **主进程服务**: `apps/electron/layers/main/src/services/claude-agent.ts`
- **类型定义**: `packages/claude-agent/src/types.ts`
- **MCP 配置**: `packages/claude-agent/src/mcp.ts`

#### 核心功能
- AI 查询和流式响应
- MCP 服务器配置管理
- 子代理支持
- 自定义命令系统

#### 配置管理
```typescript
interface IAnthropicBaseOptions {
    basePath: string;      // 用户数据存放目录
    baseURL: string;       // Anthropic API 地址
    apiKey: string;        // Anthropic API 密钥
    model: string;         // Anthropic API 模型
    globalMcpConfig?: Record<string, McpServerConfig>;
    subAgents?: Record<string, AgentDefinition>;
}
```

## 🔐 安全架构

### Electron 安全措施
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

### API 暴露清单
通过 `apps/electron/layers/preload/src/index.ts` 安全暴露的 API：

```typescript
export interface ElectronAPI {
    http: {
        request: (config: any) => Promise<any>;
    };
    system: {
        getVersions: () => Promise<Versions>;
    };
    file: {
        selectAndRead: () => Promise<string | null>;
        write: (content: string) => Promise<boolean>;
    };
    userConfig: {
        get: () => Promise<any>;
        save: (config: any) => Promise<{ success: boolean; config: any; path: string }>;
        getMcpFile: () => Promise<{ path: string; content: string }>;
        saveMcpFile: (content: string) => Promise<{ path: string; content: string }>;
    };
    claudeAgent: {
        query: (prompt: string | ClaudeAgentQueryParams) => AsyncIterable<any>;
        initialize: (options?: any) => Promise<{ success: boolean }>;
        getMcpConfig: (name?: string) => Promise<any>;
        setMcpConfig: (name: string, config: any) => Promise<{ success: boolean }>;
        getSubAgents: (name?: string) => Promise<any>;
        setSubAgents: (name: string, agentDef: any) => Promise<{ success: boolean }>;
        getCommands: (name?: string) => Promise<any>;
        setCommands: (name: string, command: string) => Promise<{ success: boolean }>;
    };
}
```

## 📦 核心模块详解

### 1. Web 应用 (apps/web)
**主要页面**:
- `Home.vue`: 首页，展示项目特性和导航
- `Download.vue`: 下载页面（浏览器专用）
- `Demo.vue`: 功能演示页面（Electron 专用）
- `AIAgent.vue`: AI Agent 交互界面

**核心工具**:
- `http.ts`: 环境自适应的 HTTP 客户端
- `env.ts`: 环境检测工具

### 2. Electron 主进程 (apps/electron/layers/main)
**主要服务**:
- `http.ts`: HTTP 请求代理服务
- `claude-agent.ts`: Claude Agent 管理服务
- `logger.ts`: 日志服务
- `user-config.ts`: 用户配置管理
- `mcp-file.ts`: MCP 配置文件管理

**IPC 处理器**:
- `http:request`: HTTP 请求代理
- `system:getVersions`: 系统版本信息
- `file:selectAndRead`: 文件选择和读取
- `file:write`: 文件写入
- `user-config:*`: 用户配置管理
- `claude-agent:*`: Claude Agent 相关操作

### 3. 预加载脚本 (apps/electron/layers/preload)
**主要职责**:
- 通过 `contextBridge` 安全暴露 API
- 实现异步迭代器模式的 AI 查询流
- 处理 IPC 通信和事件转发

### 4. 共享包 (packages)
#### shared 包
- 环境检测工具
- 通用类型定义
- 跨应用共享工具函数

#### claude-agent 包
- Claude Agent SDK 封装
- MCP 配置管理
- 子代理和命令系统
- 类型定义

## 🚀 开发流程

### 开发模式启动
```bash
# 1. 启动 Web 开发服务器
cd apps/web && pnpm dev

# 2. 在另一个终端启动 Electron
cd apps/electron && pnpm dev
```

### 构建流程
```bash
# 构建所有应用
pnpm build

# 分别构建
pnpm build:web    # 构建 Web 应用
pnpm build:electron # 构建 Electron 应用

# 打包应用
pnpm dist         # 打包所有平台
pnpm dist:mac     # 打包 Mac
pnpm dist:win     # 打包 Windows
pnpm dist:linux   # 打包 Linux
```

### 构建顺序要求
打包 Electron 应用时必须先构建 Web 项目：
```bash
cd apps/web && pnpm build
cd ../electron && pnpm build && pnpm compile
```

## 🔧 关键技术实现

### 1. Node.js 包装器机制
项目实现了智能的 Node.js 包装器，确保在打包后的应用中正确运行 MCP 服务器：

```typescript
// 创建 node 和 npx 包装器脚本
function createNodeWrappers() {
    // 在用户数据目录创建 bin 目录
    const binDir = join(app.getPath('userData'), 'bin');
    
    // 创建 node 包装器（使用 Electron 可执行文件代替 node）
    // 创建 npx 包装器（支持多平台回退机制）
    
    // 将 bin 目录添加到 PATH
    process.env.PATH = `${binDir}${pathSeparator}${process.env.PATH || ''}`;
}
```

### 2. 流式 AI 查询实现
通过异步迭代器实现高效的 AI 流式响应：

```typescript
function createClaudeAgentQueryStream(promptOrOptions: string | ClaudeAgentQueryParams): AsyncIterable<any> {
    const requestId = createRequestId();
    const messageQueue: any[] = [];
    let completed = false;
    
    // 实现异步迭代器协议
    const iterator: AsyncIterable<any> & AsyncIterator<any> = {
        async next() {
            // 处理消息队列和完成状态
        },
        async return() {
            // 清理资源和取消请求
        },
        [Symbol.asyncIterator]() {
            return this;
        }
    };
    
    return iterator;
}
```

### 3. MCP 配置管理
实现了全局 MCP 服务器配置的持久化管理：

```typescript
class GlobalMcpConfig {
    private configPath: string;
    
    constructor(basePath: string) {
        this.configPath = join(basePath, '.mcp.json');
        this.ensureConfigFile();
    }
    
    // 支持函数重载的 API 设计
    getGlobalMcpConfig(name: string): McpServerConfig | null;
    getGlobalMcpConfig(): Record<string, McpServerConfig> | null;
}
```

## 🎯 业务逻辑特点

### 1. 环境自适应
- **智能检测**: 多种方式检测运行环境
- **功能降级**: 浏览器环境下限制敏感功能
- **用户体验**: 引导用户下载桌面应用获得完整体验

### 2. AI 驱动开发
- **Claude 集成**: 深度集成 Claude Agent
- **MCP 支持**: 支持 Model Context Protocol 扩展
- **流式交互**: 高效的流式 AI 查询
- **配置管理**: 灵活的 AI 配置管理

### 3. 安全优先
- **最小权限**: 只暴露必要的 API
- **上下文隔离**: 严格的安全边界
- **输入验证**: 所有外部输入都经过验证

### 4. 开发者友好
- **类型安全**: 完整的 TypeScript 类型覆盖
- **热更新**: 开发模式支持热更新
- **详细日志**: 完整的日志记录系统

## 📁 重要文件位置

### 配置文件
- `package.json`: 根项目配置
- `pnpm-workspace.yaml`: pnpm 工作空间配置
- `turbo.json`: Turborepo 配置
- `apps/web/vite.config.ts`: Web 应用 Vite 配置
- `apps/electron/layers/main/vite.config.ts`: 主进程 Vite 配置
- `apps/electron/layers/preload/vite.config.ts`: 预加载脚本 Vite 配置

### 核心源码
- `apps/web/src/utils/http.ts`: HTTP 客户端
- `apps/web/src/utils/env.ts`: 环境检测
- `apps/web/src/router/index.ts`: 路由配置
- `apps/electron/layers/main/src/index.ts`: 主进程入口
- `apps/electron/layers/preload/src/index.ts`: 预加载脚本
- `packages/shared/src/env.ts`: 共享环境工具
- `packages/claude-agent/src/types.ts`: Claude Agent 类型

### 服务实现
- `apps/electron/layers/main/src/services/http.ts`: HTTP 服务
- `apps/electron/layers/main/src/services/claude-agent.ts`: Claude Agent 服务
- `apps/electron/layers/main/src/services/logger.ts`: 日志服务
- `apps/electron/layers/main/src/services/user-config.ts`: 用户配置服务
- `apps/electron/layers/main/src/services/mcp-file.ts`: MCP 文件服务

## 🚨 特殊注意事项

### 1. 环境变量
- `ANTHROPIC_BASE_URL`: Anthropic API 地址（默认: https://api.deepseek.com/anthropic）
- `ANTHROPIC_API_KEY`: Anthropic API 密钥
- `ANTHROPIC_MODEL`: 模型名称（默认: deepseek-chat）
- `ELECTRON_RUN_AS_NODE`: Electron Node 模式标识
- `ELECTRON_NO_ATTACH_CONSOLE`: 控制台附着控制

### 2. 路径处理
- 开发环境: 使用相对路径和 `__dirname`
- 生产环境: 使用 `app.getAppPath()` 和 `process.resourcesPath`
- 用户数据: 使用 `app.getPath('userData')` 获取用户目录

### 3. 依赖管理
- 使用 pnpm catalog 管理版本
- 内部包使用 `@electron-app/*` 前缀
- 外部依赖通过 workspace 共享

### 4. 调试技巧
- 开发模式自动打开 DevTools
- 生产模式注释掉了 DevTools（可根据需要启用）
- 详细的日志记录便于问题排查

## 🔄 扩展指南

### 添加新的 IPC 功能
1. **在 Preload 中声明**:
   ```typescript
   contextBridge.exposeInMainWorld('electronAPI', {
     newFeature: {
       method: (params) => ipcRenderer.invoke('new:method', params)
     }
   })
   ```

2. **在 Main 中实现**:
   ```typescript
   ipcMain.handle('new:method', async (event, params) => {
     // 实现逻辑
     return result
   })
   ```

3. **在 Web 中使用**:
   ```typescript
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

这个项目为现代桌面应用开发提供了一个完整、安全、可扩展的解决方案，特别适合需要 AI 集成和 MCP 支持的企业级应用。
