import type { ElectronAPI } from './src/index';

// 声明全局类型
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
