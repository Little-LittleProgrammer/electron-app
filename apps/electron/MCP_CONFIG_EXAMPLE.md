# MCP 配置示例

## 打包后可用的 MCP 配置方式

### 方式 1：使用 npx（推荐）

使用环境变量占位符，在任何用户机器上都能正常工作：

```json
{
    "mcpServers": {
        "minimax": {
            "command": "npx",
            "args": ["-y", "minimax-mcp-js"],
            "env": {
                "MINIMAX_API_HOST": "https://api.minimax.chat",
                "MINIMAX_API_KEY": "your-api-key-here",
                "MINIMAX_MCP_BASE_PATH": "${userData}/claude-agent/cache",
                "MINIMAX_RESOURCE_MODE": "local"
            }
        }
    }
}
```

### 方式 2：使用全局安装的包

如果用户已经全局安装了 `minimax-mcp-js`：

```json
{
    "mcpServers": {
        "minimax": {
            "command": "node",
            "args": [
                "${home}/.npm/_npx/*/node_modules/minimax-mcp-js/dist/index.js"
            ],
            "env": {
                "MINIMAX_API_HOST": "https://api.minimax.chat",
                "MINIMAX_API_KEY": "your-api-key-here",
                "MINIMAX_MCP_BASE_PATH": "${userData}/claude-agent/cache",
                "MINIMAX_RESOURCE_MODE": "local"
            }
        }
    }
}
```

### 方式 3：使用本地安装的包

如果将 MCP 包打包到应用中：

```json
{
    "mcpServers": {
        "minimax": {
            "command": "node",
            "args": [
                "${appPath}/mcp_modules/node_modules/minimax-mcp-js/dist/index.js"
            ],
            "env": {
                "MINIMAX_API_HOST": "https://api.minimax.chat",
                "MINIMAX_API_KEY": "your-api-key-here",
                "MINIMAX_MCP_BASE_PATH": "${userData}/claude-agent/cache",
                "MINIMAX_RESOURCE_MODE": "local"
            }
        }
    }
}
```

## 支持的环境变量占位符

- `${userData}`: 用户数据目录
  - macOS: `~/Library/Application Support/electron-app`
  - Windows: `%APPDATA%\electron-app`
  - Linux: `~/.config/electron-app`

- `${home}`: 用户主目录
  - macOS/Linux: `~`
  - Windows: `%USERPROFILE%`

- `${appPath}`: 应用安装目录
  - 开发环境: 项目根目录
  - 打包后: `app.asar` 所在目录

## 其他 MCP 服务器配置示例

### 文件系统 MCP

```json
{
    "mcpServers": {
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "${home}/Documents"],
            "env": {}
        }
    }
}
```

### GitHub MCP

```json
{
    "mcpServers": {
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {
                "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-token"
            }
        }
    }
}
```

### SQLite MCP

```json
{
    "mcpServers": {
        "sqlite": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-sqlite", "${userData}/database.db"],
            "env": {}
        }
    }
}
```

## 注意事项

1. **API Key 安全性**：不要将真实的 API Key 提交到代码仓库
2. **路径分隔符**：使用正斜杠 `/` 在所有平台上都能正常工作
3. **npx 依赖**：确保用户机器上已安装 Node.js 和 npm
4. **网络访问**：首次运行 `npx -y` 会从 npm registry 下载包
5. **权限问题**：确保应用有权限访问指定的目录

## 验证配置

可以在应用的开发者工具控制台中查看日志：

```javascript
// 打开开发者工具
// macOS: Cmd + Option + I
// Windows/Linux: Ctrl + Shift + I

// 查看 MCP 配置加载日志
// 应该能看到类似以下的日志：
// [Main] Node and npx wrappers setup completed
// [Main] Bin directory: /Users/.../Library/Application Support/electron-app/bin
// [Main] PATH starts with: /Users/.../Library/Application Support/electron-app/bin:...
```

## 故障排查

### 问题 1: npx 命令找不到

**症状**：MCP 加载失败，提示 "npx not found"

**解决方案**：
1. 确保已安装 Node.js（推荐 v18 或更高版本）
2. 检查 PATH 环境变量是否包含 npm 的 bin 目录
3. 尝试在终端运行 `which npx` (macOS/Linux) 或 `where npx` (Windows)

### 问题 2: 环境变量占位符未替换

**症状**：路径中仍包含 `${userData}` 等占位符

**解决方案**：
1. 确保使用的是最新版本的应用
2. 检查 `claude-agent.ts` 中的 `processMcpEnvVariables` 方法是否正确实现

### 问题 3: MCP 服务器启动失败

**症状**：MCP 加载时出错，或者工具调用失败

**解决方案**：
1. 检查 API Key 是否正确
2. 验证网络连接是否正常
3. 查看应用日志中的详细错误信息
4. 尝试在终端手动运行 MCP 命令测试

