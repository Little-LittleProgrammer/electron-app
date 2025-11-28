# @electron-app/shared

共享工具库，提供跨项目的通用工具函数。

## 功能

### 环境检测工具

提供在 Electron 和浏览器环境之间进行检测的工具函数。

#### API

- `isElectron(): boolean` - 检测是否在 Electron 环境中运行
- `isBrowser(): boolean` - 检测是否在浏览器环境中运行
- `getEnvironment(): 'electron' | 'browser'` - 获取运行环境类型
- `getElectronAPI()` - 获取 Electron API（仅在 Electron 环境下可用）

#### 使用示例

```typescript
import { isElectron, getEnvironment, getElectronAPI } from '@electron-app/shared';

// 检测环境
if (isElectron()) {
    console.log('运行在 Electron 环境');
} else {
    console.log('运行在浏览器环境');
}

// 获取环境类型
const env = getEnvironment(); // 'electron' | 'browser'

// 获取 Electron API
const electronAPI = getElectronAPI();
if (electronAPI) {
    // 使用 Electron API
}
```

## 构建

```bash
# 安装依赖
pnpm install

# 构建
pnpm run build

# 监听模式
pnpm run watch
```

## 开发

本包使用 Rollup 进行打包，配置文件为 `rollup.config.mjs`。

- 源代码位于 `src/` 目录
- 构建输出位于 `dist/` 目录
- 支持 ESM 和 CJS 两种格式
- 自动生成 TypeScript 类型声明文件

