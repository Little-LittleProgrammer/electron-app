// 在主进程中，我们需要导入 electron-log/main 而不是默认的 electron-log
// 这样可以确保我们获得主进程版本，包含文件传输功能
import log from 'electron-log/main';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * 日志级别
 */
export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    VERBOSE = 'verbose',
    DEBUG = 'debug',
    SILLY = 'silly',
}

/**
 * 日志配置选项
 */
export interface LoggerOptions {
    /**
     * 日志文件路径，默认在用户数据目录的 logs 文件夹中
     */
    logDir?: string;

    /**
     * 日志文件名，默认为 'main.log'
     */
    logFileName?: string;

    /**
     * 日志级别，默认为 'info'
     */
    level?: LogLevel;

    /**
     * 是否在控制台输出，默认为 true
     */
    console?: boolean;

    /**
     * 是否输出到文件，默认为 true
     */
    file?: boolean;

    /**
     * 最大日志文件大小（字节），默认为 10MB
     */
    maxSize?: number;
}

/**
 * 封装的日志服务
 */
export class Logger {
    private static instance: Logger;
    private options: Required<LoggerOptions>;
    private initialized = false;

    private constructor(options: LoggerOptions = {}) {
        this.options = {
            logDir: join(app.getPath('userData'), 'logs'),
            logFileName: 'main.log',
            level: LogLevel.INFO,
            console: true,
            file: true,
            maxSize: 10 * 1024 * 1024, // 10MB
            ...options,
        };
    }

    /**
     * 获取 Logger 单例实例
     */
    public static getInstance(options?: LoggerOptions): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(options);
        }
        return Logger.instance;
    }

    /**
     * 初始化日志配置
     */
    public initialize(): void {
        if (this.initialized) {
            return;
        }

        // 确保 logs 目录存在
        this.ensureLogDirExists();

        // 检查 electron-log 的传输类型
        console.log('electron-log transports available:', Object.keys(log.transports || {}));

        // 配置 electron-log
        // 在主进程中，log.transports 应该包含 file 和 console
        if (log.transports?.file) {
            log.transports.file.level = this.options.level as string;
        } else {
            console.warn('electron-log file transport not available!');
        }

        if (log.transports?.console) {
            log.transports.console.level = this.options.console ? (this.options.level as string) : false;
        }

        // 设置日志文件路径
        if (this.options.file && log.transports?.file) {
            // 使用 resolvePathFn 而不是已弃用的 resolvePath
            log.transports.file.resolvePathFn = () => {
                return join(this.options.logDir, this.options.logFileName);
            };

            // 设置最大文件大小
            log.transports.file.maxSize = this.options.maxSize;
        } else if (log.transports?.file) {
            log.transports.file.level = false;
        }

        // 设置日志格式
        if (log.transports?.file) {
            log.transports.file.format = '{h}:{i}:{s}.{ms} [{level}] {text}';
        }

        if (log.transports?.console) {
            log.transports.console.format = '{h}:{i}:{s}.{ms} [{level}] {text}';
        }

        this.initialized = true;

        // 测试日志写入
        this.info('Logger initialized and ready', {
            logDir: this.options.logDir,
            level: this.options.level,
            console: this.options.console,
            file: this.options.file,
            maxSize: this.options.maxSize,
            transports: Object.keys(log.transports || {}),
        });

        // 立即写入一条测试日志到文件
        this.info('Test log entry to verify file writing');
    }

    /**
     * 确保日志目录存在
     */
    private ensureLogDirExists(): void {
        try {
            if (!existsSync(this.options.logDir)) {
                mkdirSync(this.options.logDir, { recursive: true });
                console.log('Created logs directory:', this.options.logDir);
            }
        } catch (error) {
            console.error('Failed to create logs directory:', error);
        }
    }

    /**
     * 错误日志
     */
    public error(message: string, ...meta: any[]): void {
        log.error(`[Main] ${message}`, ...meta);
    }

    /**
     * 警告日志
     */
    public warn(message: string, ...meta: any[]): void {
        log.warn(`[Main] ${message}`, ...meta);
    }

    /**
     * 信息日志
     */
    public info(message: string, ...meta: any[]): void {
        log.info(`[Main] ${message}`, ...meta);
    }

    /**
     * 详细日志
     */
    public verbose(message: string, ...meta: any[]): void {
        log.verbose(`[Main] ${message}`, ...meta);
    }

    /**
     * 调试日志
     */
    public debug(message: string, ...meta: any[]): void {
        log.debug(`[Main] ${message}`, ...meta);
    }

    /**
     * 详细调试日志
     */
    public silly(message: string, ...meta: any[]): void {
        log.silly(`[Main] ${message}`, ...meta);
    }

    /**
     * 获取日志文件路径
     */
    public getLogFilePath(): string {
        return join(this.options.logDir, this.options.logFileName);
    }

    /**
     * 获取日志目录路径
     */
    public getLogDir(): string {
        return this.options.logDir;
    }

    /**
     * 更新日志配置
     */
    public updateOptions(options: Partial<LoggerOptions>): void {
        this.options = { ...this.options, ...options };
        this.initialized = false;
        this.initialize();
    }
}

/**
 * 全局日志实例
 */
export const logger = Logger.getInstance();

/**
 * 快捷方法
 */
export const logError = (message: string, ...meta: any[]) => logger.error(message, ...meta);
export const logWarn = (message: string, ...meta: any[]) => logger.warn(message, ...meta);
export const logInfo = (message: string, ...meta: any[]) => logger.info(message, ...meta);
export const logVerbose = (message: string, ...meta: any[]) => logger.verbose(message, ...meta);
export const logDebug = (message: string, ...meta: any[]) => logger.debug(message, ...meta);
export const logSilly = (message: string, ...meta: any[]) => logger.silly(message, ...meta);
