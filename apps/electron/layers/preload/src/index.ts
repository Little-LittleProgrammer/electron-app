import type { ClaudeAgentQueryParams } from '@electron-app/claude-agent';
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

/**
 * Electron Preload 脚本
 * 通过 contextBridge 安全地暴露 API 给渲染进程
 */

// 定义暴露给渲染进程的 API 接口
export interface ElectronAPI {
    // HTTP 请求 API
    http: {
        request: (config: any) => Promise<any>;
    };
    // 系统信息 API
    system: {
        getVersions: () => Promise<{
            chrome: string;
            node: string;
            electron: string;
        }>;
    };
    // 文件操作 API
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
    // Claude Agent API
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

const CLAUDE_QUERY_CHANNELS = {
    start: 'claude-agent:query:start',
    cancel: 'claude-agent:query:cancel',
    message: 'claude-agent:query:message',
    done: 'claude-agent:query:done',
    error: 'claude-agent:query:error',
} as const;

const createRequestId = () => `claude-agent-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function createClaudeAgentQueryStream(promptOrOptions: string | ClaudeAgentQueryParams): AsyncIterable<any> {
    const requestId = createRequestId();
    const messageQueue: any[] = [];
    let completed = false;
    let storedError: Error | null = null;
    let pendingResolve: ((result: IteratorResult<any>) => void) | null = null;
    let pendingReject: ((reason?: any) => void) | null = null;
    let cleanedUp = false;

    const cleanup = () => {
        if (cleanedUp) {
            return;
        }
        cleanedUp = true;
        ipcRenderer.removeListener(CLAUDE_QUERY_CHANNELS.message, onMessage);
        ipcRenderer.removeListener(CLAUDE_QUERY_CHANNELS.done, onDone);
        ipcRenderer.removeListener(CLAUDE_QUERY_CHANNELS.error, onError);
    };

    const onMessage = (_event: IpcRendererEvent, data: { requestId: string; message: any }) => {
        if (data.requestId !== requestId) {
            return;
        }
        if (pendingResolve) {
            pendingResolve({ value: data.message, done: false });
            pendingResolve = null;
            pendingReject = null;
        } else {
            messageQueue.push(data.message);
        }
    };

    const onDone = (_event: IpcRendererEvent, data: { requestId: string }) => {
        if (data.requestId !== requestId) {
            return;
        }
        completed = true;
        if (pendingResolve) {
            pendingResolve({ value: undefined, done: true });
            pendingResolve = null;
            pendingReject = null;
            cleanup();
        }
    };

    const onError = (_event: IpcRendererEvent, data: { requestId: string; error?: string }) => {
        if (data.requestId !== requestId) {
            return;
        }
        const err = new Error(data.error || 'AI 查询失败');
        if (pendingReject) {
            pendingReject(err);
            pendingResolve = null;
            pendingReject = null;
        } else {
            storedError = err;
        }
        cleanup();
    };

    ipcRenderer.on(CLAUDE_QUERY_CHANNELS.message, onMessage);
    ipcRenderer.on(CLAUDE_QUERY_CHANNELS.done, onDone);
    ipcRenderer.on(CLAUDE_QUERY_CHANNELS.error, onError);

    ipcRenderer.send(CLAUDE_QUERY_CHANNELS.start, {
        requestId,
        payload: promptOrOptions,
    });

    const iterator: AsyncIterable<any> & AsyncIterator<any> = {
        async next() {
            if (storedError) {
                const error = storedError;
                storedError = null;
                cleanup();
                throw error;
            }

            if (messageQueue.length > 0) {
                const value = messageQueue.shift();
                return { value, done: false };
            }

            if (completed) {
                cleanup();
                return { value: undefined, done: true };
            }

            return new Promise<IteratorResult<any>>((resolve, reject) => {
                pendingResolve = (result) => {
                    if (result.done) {
                        cleanup();
                    }
                    resolve(result);
                };
                pendingReject = (reason) => {
                    cleanup();
                    reject(reason);
                };
            });
        },
        async return() {
            ipcRenderer.send(CLAUDE_QUERY_CHANNELS.cancel, { requestId });
            if (pendingResolve) {
                pendingResolve({ value: undefined, done: true });
                pendingResolve = null;
                pendingReject = null;
            }
            cleanup();
            completed = true;
            return { value: undefined, done: true };
        },
        [Symbol.asyncIterator]() {
            return this;
        },
    };

    return iterator;
}

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // HTTP 请求
    http: {
        request: (config: any) => ipcRenderer.invoke('http:request', config),
    },

    // 系统信息
    system: {
        getVersions: () => ipcRenderer.invoke('system:getVersions'),
    },

    // 文件操作
    file: {
        selectAndRead: () => ipcRenderer.invoke('file:selectAndRead'),
        write: (content: string) => ipcRenderer.invoke('file:write', content),
    },
    userConfig: {
        get: () => ipcRenderer.invoke('user-config:get'),
        save: (config: any) => ipcRenderer.invoke('user-config:save', config),
        getMcpFile: () => ipcRenderer.invoke('user-config:getMcpFile'),
        saveMcpFile: (content: string) => ipcRenderer.invoke('user-config:saveMcpFile', content),
    },

    // Claude Agent
    claudeAgent: {
        query: (promptOrOptions: string | ClaudeAgentQueryParams) => createClaudeAgentQueryStream(promptOrOptions),
        initialize: (options?: any) => ipcRenderer.invoke('claude-agent:initialize', options),
        getMcpConfig: (name?: string) => ipcRenderer.invoke('claude-agent:getMcpConfig', name),
        setMcpConfig: (name: string, config: any) => ipcRenderer.invoke('claude-agent:setMcpConfig', name, config),
        getSubAgents: (name?: string) => ipcRenderer.invoke('claude-agent:getSubAgents', name),
        setSubAgents: (name: string, agentDef: any) => ipcRenderer.invoke('claude-agent:setSubAgents', name, agentDef),
        getCommands: (name?: string) => ipcRenderer.invoke('claude-agent:getCommands', name),
        setCommands: (name: string, command: string) => ipcRenderer.invoke('claude-agent:setCommands', name, command),
    },
});
