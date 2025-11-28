import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { httpService } from './services/http';
import { claudeAgentService } from './services/claude-agent';

/**
 * Electron 主进程
 */

let mainWindow: BrowserWindow | null = null;

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
app.whenReady().then(() => {
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

    // ============ Claude Agent IPC 处理器 ============

    // AI 查询
    ipcMain.handle('claude-agent:query', async (event, prompt: string) => {
        try {
            const result = await claudeAgentService.query({ prompt });
            return result;
        } catch (error: any) {
            throw new Error(error.message || 'AI 查询失败');
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
