import { contextBridge, ipcRenderer } from 'electron';

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
    // Claude Agent API
    claudeAgent: {
        query: (prompt: string) => Promise<any>;
        initialize: (options?: any) => Promise<{ success: boolean }>;
        getMcpConfig: (name?: string) => Promise<any>;
        setMcpConfig: (name: string, config: any) => Promise<{ success: boolean }>;
        getSubAgents: (name?: string) => Promise<any>;
        setSubAgents: (name: string, agentDef: any) => Promise<{ success: boolean }>;
        getCommands: (name?: string) => Promise<any>;
        setCommands: (name: string, command: string) => Promise<{ success: boolean }>;
    };
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

    // Claude Agent
    claudeAgent: {
        query: (prompt: string) => ipcRenderer.invoke('claude-agent:query', prompt),
        initialize: (options?: any) => ipcRenderer.invoke('claude-agent:initialize', options),
        getMcpConfig: (name?: string) => ipcRenderer.invoke('claude-agent:getMcpConfig', name),
        setMcpConfig: (name: string, config: any) => ipcRenderer.invoke('claude-agent:setMcpConfig', name, config),
        getSubAgents: (name?: string) => ipcRenderer.invoke('claude-agent:getSubAgents', name),
        setSubAgents: (name: string, agentDef: any) => ipcRenderer.invoke('claude-agent:setSubAgents', name, agentDef),
        getCommands: (name?: string) => ipcRenderer.invoke('claude-agent:getCommands', name),
        setCommands: (name: string, command: string) => ipcRenderer.invoke('claude-agent:setCommands', name, command),
    },
});

// 声明全局类型
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
