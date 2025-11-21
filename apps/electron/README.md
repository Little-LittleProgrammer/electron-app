# Electron App

Electron 桌面应用部分。

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（需要先启动 web 项目）
pnpm dev
```

## 构建

```bash
# 构建主进程和预加载脚本
pnpm build

# 打包应用
pnpm compile
```

## 项目结构

```
electron/
├── layers/
│   ├── main/         # 主进程
│   └── preload/      # 预加载脚本
├── scripts/
│   └── watch.js      # 开发监听脚本
└── .electron-builder.config.js
```

