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
    // 并且在打包后的应用中使用 Electron 可执行文件代替 node
    if (command === 'node' || command?.endsWith('/node') || command?.endsWith('\\node.exe')) {
        const envOptions = options || {};
        envOptions.env = {
            ...(envOptions.env || process.env),
            ELECTRON_RUN_AS_NODE: '1',
            ELECTRON_NO_ATTACH_CONSOLE: '1',
        };

        // 在打包后的应用中，使用 Electron 可执行文件代替 node
        // 这样可以确保即使系统没有安装 Node.js 也能工作
        const electronPath = process.execPath;

        logger.debug('Intercepted node spawn call', {
            originalCommand: command,
            args,
            usingElectronPath: electronPath,
            env: envOptions.env,
        });

        return originalSpawn.call(childProcess, electronPath, args || [], envOptions);
    }

    return originalSpawn.call(childProcess, command, args || [], options);
};

// 确保 Claude Agent SDK 能够找到 Node.js 和 npx 可执行文件
// 在打包后的应用中,需要创建 node 和 npx 脚本包装器来以 Node 模式运行 Electron

/**
 * 创建 node 和 npx 包装器脚本
 * 在打包后的 Electron 应用中，node 可执行文件可能不在系统的 PATH 中
 * 我们需要创建包装器脚本来使用 Electron 以 Node 模式运行
 */
function createNodeWrappers() {
    try {
        const binDir = join(app.getPath('userData'), 'bin');

        // 创建 bin 目录
        if (!existsSync(binDir)) {
            mkdirSync(binDir, { recursive: true });
        }

        // 获取 Electron 可执行文件路径
        const electronPath = process.execPath;

        // 创建 node 包装器脚本
        const nodeWrapperPath = join(binDir, 'node');
        let nodeWrapperContent: string;

        if (process.platform === 'win32') {
            // Windows 批处理脚本
            nodeWrapperContent = `@echo off
set ELECTRON_RUN_AS_NODE=1
set ELECTRON_NO_ATTACH_CONSOLE=1
"${electronPath}" %*`;
            writeFileSync(nodeWrapperPath + '.bat', nodeWrapperContent);
            // 同时创建 .cmd 版本
            writeFileSync(nodeWrapperPath + '.cmd', nodeWrapperContent);
        } else {
            // Unix shell 脚本
            nodeWrapperContent = `#!/bin/sh
export ELECTRON_RUN_AS_NODE=1
export ELECTRON_NO_ATTACH_CONSOLE=1
"${electronPath}" "$@"`;
            writeFileSync(nodeWrapperPath, nodeWrapperContent);
            chmodSync(nodeWrapperPath, 0o755); // 添加执行权限
        }

        // 创建 npx 包装器脚本
        // 健壮的 npx 包装器，可以处理系统没有安装 npx 的情况
        const npxWrapperPath = join(binDir, 'npx');
        let npxWrapperContent: string;

        if (process.platform === 'win32') {
            // Windows 批处理脚本
            npxWrapperContent = `@echo off
setlocal enabledelayedexpansion

:: 首先尝试直接调用 npx.cmd
where npx.cmd >nul 2>nul
if !errorlevel! equ 0 (
    npx.cmd %*
    exit /b !errorlevel!
)

:: 如果 npx.cmd 不存在，尝试使用 npm exec
where npm.cmd >nul 2>nul
if !errorlevel! equ 0 (
    npm.cmd exec %*
    exit /b !errorlevel!
)

:: 如果都没有，显示错误信息
echo Error: Neither npx nor npm found in PATH.
echo Please install Node.js or ensure it's in your PATH.
exit /b 1`;
            writeFileSync(npxWrapperPath + '.bat', npxWrapperContent);
            writeFileSync(npxWrapperPath + '.cmd', npxWrapperContent);
        } else {
            // Unix shell 脚本
            npxWrapperContent = `#!/bin/sh

# 首先尝试直接调用 npx
if command -v npx >/dev/null 2>&1; then
    exec npx "$@"
fi

# 如果 npx 不存在，尝试使用 npm exec
if command -v npm >/dev/null 2>&1; then
    exec npm exec "$@"
fi

# 如果都没有，显示错误信息
echo "Error: Neither npx nor npm found in PATH."
echo "Please install Node.js or ensure it's in your PATH."
exit 1`;
            writeFileSync(npxWrapperPath, npxWrapperContent);
            chmodSync(npxWrapperPath, 0o755); // 添加执行权限
        }

        // 将 bin 目录添加到 PATH 环境变量的开头
        const pathSeparator = process.platform === 'win32' ? ';' : ':';
        process.env.PATH = `${binDir}${pathSeparator}${process.env.PATH || ''}`;

        logger.info('Node and npx wrappers setup completed', {
            binDir,
            electronPath,
            nodeWrapperPath: process.platform === 'win32' ? `${nodeWrapperPath}.bat` : nodeWrapperPath,
            npxWrapperPath: process.platform === 'win32' ? `${npxWrapperPath}.bat` : npxWrapperPath,
            pathPrefix: `${binDir}${pathSeparator}...`,
        });

        return binDir;
    } catch (error) {
        logger.error('Failed to create node wrappers', error);
        throw error;
    }
}

let mainWindow: BrowserWindow | null = null;
const activeClaudeAgentStreams = new Map<string, { cancelled: boolean }>();
const USER_ENV_FILE = join(DEFAULT_PATH, '.env.json');

const applyConfigToEnv = (config: UserEnvConfig) => {
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
    console.log('[Main] createWindow', app.getVersion());
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

    // 创建 node 和 npx 包装器
    try {
        createNodeWrappers();
    } catch (error) {
        logger.error('Failed to create node wrappers', error);
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
