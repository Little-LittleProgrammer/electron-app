/**
 * 环境检测工具
 */

/**
 * 检测是否在 Electron 环境中运行
 */
export const isElectron = (): boolean => {
    // 检查 window.electronAPI 是否存在（由 preload 脚本注入）
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return true;
    }

    // 检查 userAgent
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('electron')) {
        return true;
    }

    return false;
};

/**
 * 检测是否在浏览器环境中运行
 */
export const isBrowser = (): boolean => {
    return !isElectron();
};

/**
 * 获取运行环境类型
 */
export const getEnvironment = (): 'electron' | 'browser' => {
    return isElectron() ? 'electron' : 'browser';
};

/**
 * 获取 Electron API（仅在 Electron 环境下可用）
 */
export const getElectronAPI = () => {
    if (!isElectron()) {
        console.warn('当前不在 Electron 环境中，无法访问 Electron API');
        return null;
    }
    return (window as any).electronAPI;
};
