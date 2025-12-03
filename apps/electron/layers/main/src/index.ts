import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import type { IpcMainEvent } from 'electron';
import { join, dirname } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { existsSync, unlinkSync, mkdirSync, writeFileSync, chmodSync } from 'fs';
import type { ClaudeAgentQueryParams } from '@electron-app/claude-agent';
import { httpService } from './services/http';
import { claudeAgentService, DEFAULT_PATH } from './services/claude-agent';
import { readUserEnvConfig, writeUserEnvConfig, type UserEnvConfig } from './services/user-config';
import { readMcpFile, writeMcpFile } from './services/mcp-file';
import { logger } from './services/logger';
import childProcess from 'child_process';

/**
 * Electron 主进程
 */

// Hook child_process.spawn 以确保 MCP 服务器正确设置环境变量
// 这样可以防止 Electron 在启动 MCP 服务器时打开 GUI 窗口
const originalSpawn = childProcess.spawn;
(childProcess as any).spawn = function (command: string, args?: readonly string[], options?: any): any {
    // 如果命令是 'node'，确保设置 ELECTRON_RUN_AS_NODE
    if (command === 'node' || command?.endsWith('/node') || command?.endsWith('\\node.exe')) {
        const envOptions = options || {};
        envOptions.env = {
            ...(envOptions.env || process.env),
            ELECTRON_RUN_AS_NODE: '1',
            ELECTRON_NO_ATTACH_CONSOLE: '1',
        };
        return originalSpawn.call(childProcess, command, args || [], envOptions);
    }

    return originalSpawn.call(childProcess, command, args || [], options);
};

// 确保 Claude Agent SDK 能够找到 Node.js 和 npx 可执行文件
// 在打包后的应用中,需要创建 node 和 npx 脚本包装器来以 Node 模式运行 Electron
const _setupNodePath = () => {
    const electronPath = process.execPath;
    const _electronDir = dirname(electronPath);

    // 在用户数据目录创建 bin 目录
    const binDir = join(app.getPath('userData'), 'bin');

    try {
        // 创建 bin 目录
        if (!existsSync(binDir)) {
            mkdirSync(binDir, { recursive: true });
        }

        // 根据平台创建不同的 node 和 npx 包装器脚本
        if (process.platform === 'win32') {
            // Windows: 创建 node.cmd 和 npx.cmd 批处理文件
            const nodeCmdPath = join(binDir, 'node.cmd');
            const npxCmdPath = join(binDir, 'npx.cmd');

            const nodeBatchContent = `@echo off\nset ELECTRON_RUN_AS_NODE=1\nset ELECTRON_NO_ATTACH_CONSOLE=1\n"${electronPath}" %*`;

            // npx 需要调用系统的 npx，但使用我们的 node
            // 尝试多个可能的 npx 位置
            const npxBatchContent = `@echo off
set ELECTRON_RUN_AS_NODE=1
set ELECTRON_NO_ATTACH_CONSOLE=1

REM 尝试查找系统的 npx
where npx.cmd >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "delims=" %%i in ('where npx.cmd') do (
        if not "%%i"=="%~f0" (
            "%%i" %*
            exit /b %ERRORLEVEL%
        )
    )
)

REM 如果找不到系统 npx，尝试使用 npm 的 npx
if exist "%APPDATA%\\npm\\node_modules\\npm\\bin\\npx-cli.js" (
    "${electronPath}" "%APPDATA%\\npm\\node_modules\\npm\\bin\\npx-cli.js" %*
    exit /b %ERRORLEVEL%
)

echo npx not found. Please install Node.js globally. >&2
exit /b 1`;

            // 如果文件已存在，先删除
            if (existsSync(nodeCmdPath)) {
                try {
                    unlinkSync(nodeCmdPath);
                } catch (_err) {
                    // 静默失败
                }
            }
            if (existsSync(npxCmdPath)) {
                try {
                    unlinkSync(npxCmdPath);
                } catch (_err) {
                    // 静默失败
                }
            }

            writeFileSync(nodeCmdPath, nodeBatchContent);
            writeFileSync(npxCmdPath, npxBatchContent);

            logger.info('Created Windows wrappers', { nodeCmdPath, npxCmdPath });
        } else {
            // macOS/Linux: 创建 node 和 npx shell 脚本
            const nodeScriptPath = join(binDir, 'node');
            const npxScriptPath = join(binDir, 'npx');
            const npmScriptPath = join(binDir, 'npm');

            const nodeShellScript = `#!/bin/sh
# Wrapper script to run Electron as Node.js
# This prevents Electron from opening GUI windows when used as node

export ELECTRON_RUN_AS_NODE=1
export ELECTRON_NO_ATTACH_CONSOLE=1
exec "${electronPath}" "$@"`;

            // npx 包装器：查找系统的 npx 并使用它
            const npxShellScript = `#!/bin/sh
# Wrapper script for npx
# This ensures npx uses our custom node wrapper

export ELECTRON_RUN_AS_NODE=1
export ELECTRON_NO_ATTACH_CONSOLE=1

# 尝试查找系统的 npx（排除当前脚本自身）
SYSTEM_NPX=""
for npx_path in /usr/local/bin/npx /usr/bin/npx /opt/homebrew/bin/npx ~/.nvm/versions/node/*/bin/npx; do
    if [ -f "$npx_path" ] && [ "$npx_path" != "$0" ]; then
        SYSTEM_NPX="$npx_path"
        break
    fi
done

# 如果找到系统 npx，使用它
if [ -n "$SYSTEM_NPX" ]; then
    exec "$SYSTEM_NPX" "$@"
fi

# 如果没找到，尝试使用 npm 自带的 npx
if [ -f ~/.npm/_npx/*/node_modules/.bin/npx ]; then
    exec ~/.npm/_npx/*/node_modules/.bin/npx "$@"
fi

# 最后尝试直接调用 npx（依赖 PATH）
if command -v npx >/dev/null 2>&1; then
    REAL_NPX=$(command -v npx)
    if [ "$REAL_NPX" != "$0" ]; then
        exec "$REAL_NPX" "$@"
    fi
fi

echo "npx not found. Please install Node.js globally." >&2
exit 1`;

            const npmShellScript = `#!/bin/sh
# Wrapper script for npm
# This ensures npm uses our custom node wrapper

export ELECTRON_RUN_AS_NODE=1
export ELECTRON_NO_ATTACH_CONSOLE=1
exec "${electronPath}" "$@"`;

            // 如果文件已存在，先删除
            if (existsSync(nodeScriptPath)) {
                try {
                    unlinkSync(nodeScriptPath);
                } catch (_err) {
                    // 静默失败
                }
            }
            if (existsSync(npxScriptPath)) {
                try {
                    unlinkSync(npxScriptPath);
                } catch (_err) {
                    // 静默失败
                }
            }
            if (existsSync(npmScriptPath)) {
                try {
                    unlinkSync(npmScriptPath);
                } catch (_err) {
                    // 静默失败
                }
            }

            writeFileSync(nodeScriptPath, nodeShellScript);
            writeFileSync(npxScriptPath, npxShellScript);
            writeFileSync(npmScriptPath, npmShellScript);
            // 确保有执行权限
            chmodSync(nodeScriptPath, 0o755);
            chmodSync(npxScriptPath, 0o755);

            logger.info('Created Unix wrappers', { nodeScriptPath, npxScriptPath });
        }

        // 将 bin 目录添加到 PATH 的最前面（优先级最高）
        const pathSeparator = process.platform === 'win32' ? ';' : ':';
        const currentPath = process.env.PATH || '';

        // 确保 binDir 在 PATH 的最前面，并移除可能存在的重复项
        const pathParts = currentPath.split(pathSeparator).filter((p) => p && p !== binDir);
        process.env.PATH = [binDir, ...pathParts].join(pathSeparator);

        logger.info('Node and npx wrappers setup completed');
        logger.info('Bin directory', { binDir });
        logger.info('PATH starts with', { pathStart: process.env.PATH?.split(pathSeparator).slice(0, 3).join(pathSeparator) });
    } catch (error) {
        logger.error('Failed to setup node path', error);
        // 退回方案：添加 electron 目录到 PATH
        const pathSeparator = process.platform === 'win32' ? ';' : ':';
        const electronDir = dirname(electronPath);
        if (!process.env.PATH?.includes(electronDir)) {
            process.env.PATH = `${electronDir}${pathSeparator}${process.env.PATH || ''}`;
        }
    }
};

let mainWindow: BrowserWindow | null = null;
const activeClaudeAgentStreams = new Map<string, { cancelled: boolean }>();
const USER_ENV_FILE = join(DEFAULT_PATH, '.env.json');

const applyConfigToEnv = (config: UserEnvConfig) => {
    process.env.DEBUG = '1';
    if (config.baseURL) {
        process.env.ANTHROPIC_BASE_URL = config.baseURL;
    }
    if (config.apiKey) {
        process.env.ANTHROPIC_AUTH_TOKEN = config.apiKey;
    }
    if (config.model) {
        process.env.ANTHROPIC_MODEL = config.model;
    }
};

const hydrateUserEnvConfig = async () => {
    try {
        const saved = await readUserEnvConfig(USER_ENV_FILE);
        if (Object.keys(saved).length > 0) {
            applyConfigToEnv(saved);
        }
    } catch (error) {
        // 忽略读取配置文件的错误
        logger.debug('Failed to read user env config', error);
    }
};

/**
 * 创建主窗口
 */
function createWindow() {
    // 设置 preload 路径
    let preloadPath: string;
    if (process.env.NODE_ENV === 'development') {
        // 开发环境：__dirname 是 apps/electron/layers/main/dist
        // ../../preload/dist/index.cjs → apps/electron/layers/preload/dist/index.cjs
        preloadPath = join(__dirname, '..', '..', 'preload', 'dist', 'index.cjs');
    } else {
        // 生产环境：app.getAppPath() 返回 app.asar 的路径
        // app.asar 内部结构: layers/main/dist/index.cjs 和 layers/preload/dist/index.cjs
        preloadPath = join(app.getAppPath(), 'layers', 'preload', 'dist', 'index.cjs');
    }

    console.log('[Main] ==================== 路径信息 ====================');
    console.log('[Main] NODE_ENV:', process.env.NODE_ENV);
    console.log('[Main] __dirname:', __dirname);
    console.log('[Main] app.getAppPath():', app.getAppPath());
    console.log('[Main] process.resourcesPath:', process.resourcesPath);
    console.log('[Main] Preload path:', preloadPath);
    console.log('[Main] Preload exists:', existsSync(preloadPath));
    logger.info('==================== 路径信息 ====================');
    logger.info('NODE_ENV', { NODE_ENV: process.env.NODE_ENV });
    logger.info('__dirname', { __dirname });
    logger.info('app.getAppPath()', { appPath: app.getAppPath() });
    logger.info('process.resourcesPath', { resourcesPath: process.resourcesPath });
    logger.info('Preload path', { preloadPath });
    logger.info('Preload exists', { exists: existsSync(preloadPath) });

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // 监听 preload 脚本加载错误
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
        logger.error('Page failed to load', { errorCode, errorDescription });
    });

    mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
        logger.error('Preload script error', { preloadPath, error });
    });

    // 加载页面
    if (process.env.NODE_ENV === 'development') {
        // 开发模式：加载开发服务器
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // 生产模式：加载打包后的文件
        // 使用 process.resourcesPath 来访问 extraResources 中的文件
        const rendererPath = join(process.resourcesPath, 'renderer/dist/index.html');
        console.log('[Main] Renderer path:', rendererPath);
        console.log('[Main] Renderer exists:', existsSync(rendererPath));
        console.log('[Main] ===================================================');
        logger.info('Renderer path', { rendererPath });
        logger.info('Renderer exists', { exists: existsSync(rendererPath) });
        logger.info('===================================================');

        mainWindow.loadFile(rendererPath);

        // 生产环境也打开开发者工具，方便调试
        // mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
 * 应用准备就绪
 */
app.whenReady().then(async () => {
    // 初始化日志系统
    logger.initialize();

    // 首先设置 Node 路径，确保 Claude Agent SDK 能找到 node 命令
    // setupNodePath();

    await hydrateUserEnvConfig();

    // 初始化 Claude Agent
    try {
        claudeAgentService.initialize();
        logger.info('Claude Agent service initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize Claude Agent service', error);
    }

    // 注册 IPC 处理器
    registerIpcHandlers();

    // 创建窗口
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

/**
 * 所有窗口关闭时退出应用（macOS 除外）
 */
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

/**
 * 注册 IPC 处理器
 */
function registerIpcHandlers() {
    // HTTP 请求处理
    ipcMain.handle('http:request', async (_event, config) => {
        try {
            const response = await httpService.request(config);
            return response;
        } catch (error: any) {
            throw new Error(error.message || 'HTTP 请求失败');
        }
    });

    // 获取系统版本信息
    ipcMain.handle('system:getVersions', async () => {
        return {
            chrome: process.versions.chrome,
            node: process.versions.node,
            electron: process.versions.electron,
        };
    });

    // 文件选择和读取
    ipcMain.handle('file:selectAndRead', async () => {
        try {
            const window = mainWindow;
            const result = await dialog.showOpenDialog(window || undefined, {
                properties: ['openFile'],
                filters: [
                    { name: 'Text Files', extensions: ['txt', 'md', 'json', 'js', 'ts'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            });

            if (result.canceled || result.filePaths.length === 0) {
                return null;
            }

            const filePath = result.filePaths[0];
            const content = await readFile(filePath, 'utf-8');
            return content;
        } catch (error: any) {
            throw new Error(`读取文件失败: ${error.message}`);
        }
    });

    // 文件写入
    ipcMain.handle('file:write', async (_event, content: string) => {
        try {
            const window = mainWindow;
            const result = await dialog.showSaveDialog(window || undefined, {
                defaultPath: 'test.txt',
                filters: [
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            });

            if (result.canceled || !result.filePath) {
                return false;
            }

            await writeFile(result.filePath, content, 'utf-8');
            return true;
        } catch (error: any) {
            throw new Error(`写入文件失败: ${error.message}`);
        }
    });

    ipcMain.handle('user-config:get', async () => {
        try {
            return await readUserEnvConfig(USER_ENV_FILE);
        } catch (error: any) {
            throw new Error(error.message || '读取用户配置失败');
        }
    });

    ipcMain.handle('user-config:save', async (_event, payload: UserEnvConfig) => {
        try {
            const saved = await writeUserEnvConfig(USER_ENV_FILE, payload || {});
            applyConfigToEnv(saved);
            return { success: true, config: saved, path: USER_ENV_FILE };
        } catch (error: any) {
            throw new Error(error.message || '保存用户配置失败');
        }
    });

    ipcMain.handle('user-config:getMcpFile', async () => {
        try {
            return await readMcpFile();
        } catch (error: any) {
            throw new Error(error.message || '读取 .mcp.json 失败');
        }
    });

    ipcMain.handle('user-config:saveMcpFile', async (_event, content: string) => {
        try {
            return await writeMcpFile(content);
        } catch (error: any) {
            throw new Error(error.message || '保存 .mcp.json 失败');
        }
    });

    // ============ Claude Agent IPC 处理器 ============

    // AI 查询
    // ipcMain.handle('claude-agent:query', async (event, promptOrOptions: string | ClaudeAgentQueryParams) => {
    //     try {
    //         const stream = claudeAgentService.query(promptOrOptions);
    //         await stream.setPermissionMode('bypassPermissions');
    //         let finalResult: any = null;

    //         for await (const message of stream) {
    //             if (message.type === 'result') {
    //                 finalResult = message.result;
    //             }
    //         }

    //         if (finalResult === null) {
    //             throw new Error('Claude Agent 未返回 result 消息');
    //         }

    //         return finalResult;
    //     } catch (error: any) {
    //         throw new Error(error.message || 'AI 查询失败');
    //     }
    // });

    ipcMain.on('claude-agent:query:start', (event, payload) => {
        void handleClaudeAgentStream(event, payload);
    });

    ipcMain.on('claude-agent:query:cancel', (_event, { requestId }: { requestId: string }) => {
        const streamState = activeClaudeAgentStreams.get(requestId);
        if (streamState) {
            streamState.cancelled = true;
        }
    });

    // 初始化 Agent（允许前端传入配置）
    ipcMain.handle('claude-agent:initialize', async (_event, options?: any) => {
        try {
            claudeAgentService.initialize(options);
            return { success: true };
        } catch (error: any) {
            throw new Error(error.message || 'Agent 初始化失败');
        }
    });

    // 获取 MCP 配置
    ipcMain.handle('claude-agent:getMcpConfig', async (_event, name?: string) => {
        try {
            return claudeAgentService.getGlobalMcpConfig(name);
        } catch (error: any) {
            throw new Error(error.message || '获取 MCP 配置失败');
        }
    });

    // 设置 MCP 配置
    ipcMain.handle('claude-agent:setMcpConfig', async (_event, name: string, config: any) => {
        try {
            claudeAgentService.setGlobalMcpConfig(name, config);
            return { success: true };
        } catch (error: any) {
            throw new Error(error.message || '设置 MCP 配置失败');
        }
    });

    // 获取子代理
    ipcMain.handle('claude-agent:getSubAgents', async (_event, name?: string) => {
        try {
            return claudeAgentService.getGlobalSubAgents(name);
        } catch (error: any) {
            throw new Error(error.message || '获取子代理失败');
        }
    });

    // 设置子代理
    ipcMain.handle('claude-agent:setSubAgents', async (_event, name: string, agentDef: any) => {
        try {
            claudeAgentService.setGlobalSubAgents(name, agentDef);
            return { success: true };
        } catch (error: any) {
            throw new Error(error.message || '设置子代理失败');
        }
    });

    // 获取命令
    ipcMain.handle('claude-agent:getCommands', async (_event, name?: string) => {
        try {
            return claudeAgentService.getGlobalCommands(name);
        } catch (error: any) {
            throw new Error(error.message || '获取命令失败');
        }
    });

    // 设置命令
    ipcMain.handle('claude-agent:setCommands', async (_event, name: string, command: string) => {
        try {
            claudeAgentService.setGlobalCommands(name, command);
            return { success: true };
        } catch (error: any) {
            throw new Error(error.message || '设置命令失败');
        }
    });
}

type ClaudeAgentStreamPayload = {
    requestId: string;
    payload: string | ClaudeAgentQueryParams;
};

async function handleClaudeAgentStream(event: IpcMainEvent, payload: ClaudeAgentStreamPayload) {
    if (!payload?.requestId) {
        return;
    }

    const { requestId, payload: promptOrOptions } = payload;
    const target = event.sender;
    const streamState = { cancelled: false };

    activeClaudeAgentStreams.set(requestId, streamState);

    try {
        const stream = claudeAgentService.query(promptOrOptions);
        stream.setPermissionMode('bypassPermissions');

        for await (const message of stream) {
            if (streamState.cancelled || target.isDestroyed()) {
                break;
            }
            target.send('claude-agent:query:message', { requestId, message });
        }

        if (!target.isDestroyed()) {
            target.send('claude-agent:query:done', { requestId });
        }
    } catch (error: any) {
        if (!target.isDestroyed()) {
            target.send('claude-agent:query:error', {
                requestId,
                error: error.message || 'AI 查询失败',
            });
        }
    } finally {
        activeClaudeAgentStreams.delete(requestId);
    }
}
