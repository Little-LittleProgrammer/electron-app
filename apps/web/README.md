# Web App

Web 应用部分，可以独立运行在浏览器中，也可以作为 Electron 的渲染进程。

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 预览构建
pnpm preview
```

## 构建

```bash
# 构建生产版本
pnpm build
```

## 环境说明

### 浏览器环境

在浏览器中运行时，会自动跳转到下载页面，引导用户下载桌面应用。

### Electron 环境

在 Electron 中运行时，可以访问所有功能，包括：

- HTTP 请求（通过 IPC 代理）
- 文件操作
- 系统信息
- 系统通知

## 目录结构

```
web/
├── src/
│   ├── views/          # 页面组件
│   ├── utils/          # 工具函数
│   ├── router/         # 路由配置
│   ├── App.vue
│   └── main.ts
├── public/
├── index.html
└── vite.config.ts
```

