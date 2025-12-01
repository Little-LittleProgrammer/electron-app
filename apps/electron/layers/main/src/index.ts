import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import type { IpcMainEvent } from 'electron';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { ClaudeAgentQueryParams } from '@electron-app/claude-agent';
import { httpService } from './services/http';
import { claudeAgentService, DEFAULT_PATH } from './services/claude-agent';
import { readUserEnvConfig, writeUserEnvConfig, type UserEnvConfig } from './services/user-config';
import { readMcpFile, writeMcpFile } from './services/mcp-file';

/**
 * Electron 主进程
 */

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
            console.log('[Main] 已加载用户配置:', USER_ENV_FILE);
        }
    } catch (error) {
        console.warn('[Main] 读取用户配置失败:', error);
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
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('[Main] Page failed to load:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
        console.error('[Main] Preload script error:', preloadPath, error);
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
    await hydrateUserEnvConfig();

    // 初始化 Claude Agent
    try {
        claudeAgentService.initialize();
        console.log('[Main] Claude Agent 服务初始化成功');
    } catch (error) {
        console.error('[Main] Claude Agent 服务初始化失败:', error);
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
    ipcMain.handle('http:request', async (event, config) => {
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
            const result = await dialog.showOpenDialog(mainWindow!, {
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
    ipcMain.handle('file:write', async (event, content: string) => {
        try {
            const result = await dialog.showSaveDialog(mainWindow!, {
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
    ipcMain.handle('claude-agent:initialize', async (event, options?: any) => {
        try {
            claudeAgentService.initialize(options);
            return { success: true };
        } catch (error: any) {
            throw new Error(error.message || 'Agent 初始化失败');
        }
    });

    // 获取 MCP 配置
    ipcMain.handle('claude-agent:getMcpConfig', async (event, name?: string) => {
        try {
            return claudeAgentService.getGlobalMcpConfig(name);
        } catch (error: any) {
            throw new Error(error.message || '获取 MCP 配置失败');
        }
    });

    // 设置 MCP 配置
    ipcMain.handle('claude-agent:setMcpConfig', async (event, name: string, config: any) => {
        try {
            claudeAgentService.setGlobalMcpConfig(name, config);
            return { success: true };
        } catch (error: any) {
            throw new Error(error.message || '设置 MCP 配置失败');
        }
    });

    // 获取子代理
    ipcMain.handle('claude-agent:getSubAgents', async (event, name?: string) => {
        try {
            return claudeAgentService.getGlobalSubAgents(name);
        } catch (error: any) {
            throw new Error(error.message || '获取子代理失败');
        }
    });

    // 设置子代理
    ipcMain.handle('claude-agent:setSubAgents', async (event, name: string, agentDef: any) => {
        try {
            claudeAgentService.setGlobalSubAgents(name, agentDef);
            return { success: true };
        } catch (error: any) {
            throw new Error(error.message || '设置子代理失败');
        }
    });

    // 获取命令
    ipcMain.handle('claude-agent:getCommands', async (event, name?: string) => {
        try {
            return claudeAgentService.getGlobalCommands(name);
        } catch (error: any) {
            throw new Error(error.message || '获取命令失败');
        }
    });

    // 设置命令
    ipcMain.handle('claude-agent:setCommands', async (event, name: string, command: string) => {
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
