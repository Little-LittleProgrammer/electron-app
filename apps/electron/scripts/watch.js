/**
 * Electron 开发模式监听脚本
 * 同时启动主进程和预加载脚本的构建监听
 */

const { spawn } = require('child_process');
const { join } = require('path');
const electron = require('electron');

// 存储子进程
let electronProcess = null;
let mainProcess = null;
let preloadProcess = null;

// 防抖标志
let isRestarting = false;
let restartTimer = null;

/**
 * 启动 Vite 构建监听
 */
function startViteBuild(name, cwd) {
    console.log(`[${name}] 启动构建监听...`);

    const process = spawn('npx', ['vite', 'build', '--watch'], {
        cwd,
        stdio: 'inherit',
        shell: true,
    });

    process.on('error', (error) => {
        console.error(`[${name}] 构建失败:`, error);
    });

    return process;
}

/**
 * 启动 Electron
 */
async function startElectron() {
    // 如果已有进程在运行，先关闭它
    if (electronProcess) {
        console.log('[Electron] 重启中，正在关闭旧进程...');

        return new Promise((resolve) => {
            electronProcess.once('close', () => {
                console.log('[Electron] 旧进程已关闭');
                electronProcess = null;

                // 等待一小段时间确保端口释放
                setTimeout(() => {
                    startElectronProcess();
                    resolve();
                }, 300);
            });

            // 强制关闭
            electronProcess.kill('SIGTERM');

            // 超时保护：如果 2 秒后还没关闭，强制 kill
            setTimeout(() => {
                if (electronProcess) {
                    console.log('[Electron] 强制终止进程');
                    electronProcess.kill('SIGKILL');
                    electronProcess = null;
                    startElectronProcess();
                    resolve();
                }
            }, 2000);
        });
    }

    startElectronProcess();
}

/**
 * 启动 Electron 进程
 */
function startElectronProcess() {
    console.log('[Electron] 启动应用...');

    electronProcess = spawn(electron, ['.'], {
        cwd: join(__dirname, '..'),
        stdio: 'inherit',
        env: {
            ...process.env,
            NODE_ENV: 'development',
        },
    });

    electronProcess.on('close', (code) => {
        if (code !== null && code !== 0) {
            console.log(`[Electron] 进程退出，代码: ${code}`);
        }
        electronProcess = null;
    });

    electronProcess.on('error', (error) => {
        console.error('[Electron] 进程错误:', error);
        electronProcess = null;
    });
}

/**
 * 主函数
 */
async function main() {
    console.log('========================================');
    console.log('  Electron 开发模式');
    console.log('========================================\n');

    // 启动主进程构建监听
    mainProcess = startViteBuild('Main', join(__dirname, '../layers/main'));

    // 启动预加载脚本构建监听
    preloadProcess = startViteBuild('Preload', join(__dirname, '../layers/preload'));

    // 等待初始构建完成
    console.log('\n等待初始构建完成...\n');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 启动 Electron
    startElectron();

    // 监听文件变化并重启 Electron
    const chokidar = require('chokidar');
    const watcher = chokidar.watch([join(__dirname, '../layers/main/dist'), join(__dirname, '../layers/preload/dist')], {
        ignoreInitial: true,
    });

    watcher.on('change', (path) => {
        console.log(`\n[文件变化] ${path}`);

        // 防抖：避免短时间内多次重启
        if (isRestarting) {
            console.log('[防抖] 正在重启中，跳过此次触发');
            return;
        }

        // 清除之前的定时器
        if (restartTimer) {
            clearTimeout(restartTimer);
        }

        // 延迟 500ms 重启，如果期间还有变化则重新计时
        restartTimer = setTimeout(() => {
            isRestarting = true;
            startElectron().finally(() => {
                isRestarting = false;
                restartTimer = null;
            });
        }, 500);
    });
}

// 处理退出信号
process.on('SIGINT', () => {
    console.log('\n正在关闭...');
    cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
});

/**
 * 清理所有进程
 */
function cleanup() {
    if (electronProcess) {
        try {
            electronProcess.kill('SIGTERM');
        } catch (e) {
            // 忽略错误
        }
    }
    if (mainProcess) {
        try {
            mainProcess.kill('SIGTERM');
        } catch (e) {
            // 忽略错误
        }
    }
    if (preloadProcess) {
        try {
            preloadProcess.kill('SIGTERM');
        } catch (e) {
            // 忽略错误
        }
    }
}

// 启动
main().catch((error) => {
    console.error('启动失败:', error);
    process.exit(1);
});
