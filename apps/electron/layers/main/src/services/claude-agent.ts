import { ClaudeAgent, type ClaudeAgentQueryParams } from '@electron-app/claude-agent';
import { app } from 'electron';
import { join } from 'path';
import type { IAnthropicBaseOptions } from '@electron-app/claude-agent/src/types';
import { logger } from './logger';

export const DEFAULT_PATH = join(app.getPath('userData'), 'claude-agent');

/**
 * Claude Agent 服务
 * 用于管理 AI Agent 实例
 */
class ClaudeAgentService {
    private agent: ClaudeAgent | null = null;

    /**
     * 初始化 Claude Agent
     */
    initialize(options?: Partial<IAnthropicBaseOptions>) {
        // 使用用户数据目录作为基础路径
        const basePath = options?.basePath || DEFAULT_PATH;

        const defaultOptions: IAnthropicBaseOptions = {
            basePath,
            baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic',
            apiKey: process.env.ANTHROPIC_API_KEY || '',
            model: process.env.ANTHROPIC_MODEL || 'deepseek-chat',
            ...options,
        };

        this.agent = new ClaudeAgent(defaultOptions);
        return this.agent;
    }

    /**
     * 获取 Agent 实例
     */
    getAgent(): ClaudeAgent {
        if (!this.agent) {
            throw new Error('Claude Agent 未初始化，请先调用 initialize()');
        }
        return this.agent;
    }

    /**
     * 查询 AI（支持字符串 prompt 或完整配置），默认返回 SDK 的流式结果
     */
    query(promptOrOptions: string | ClaudeAgentQueryParams) {
        try {
            const agent = this.getAgent();
            const baseOptions: ClaudeAgentQueryParams = typeof promptOrOptions === 'string' ? { prompt: promptOrOptions } : { ...promptOrOptions };

            const cwd = baseOptions.options?.cwd || DEFAULT_PATH;
            const mcpServers = agent.getGlobalMcpConfig();

            // 处理 MCP 配置中的环境变量占位符
            const processedMcpServers = this.processMcpEnvVariables(mcpServers);

            const options: ClaudeAgentQueryParams['options'] = {
                ...baseOptions.options,
                cwd,
                allowDangerouslySkipPermissions: true,
                env: {
                    // 复制当前进程的所有环境变量
                    ...process.env,
                    // 确保 PATH 包含我们的 bin 目录
                    PATH: process.env.PATH || '',
                    // Anthropic 相关环境变量
                    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || '',
                    ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN || '',
                    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || '',
                    // 确保 Electron 以 Node 模式运行
                    ELECTRON_RUN_AS_NODE: '1',
                    ELECTRON_NO_ATTACH_CONSOLE: '1',
                },
            };
            if (mcpServers) {
                options.mcpServers = { ...processedMcpServers, ...baseOptions.options?.mcpServers };
            }
            logger.info('Processed MCP servers', options.mcpServers);

            return agent.query({
                ...baseOptions,
                options,
            });
        } catch (error) {
            logger.error('Failed to query Claude Agent', error);
            throw error;
        }
    }

    /**
     * 处理 MCP 配置中的环境变量占位符
     * 支持的占位符：
     * - ${userData}: 用户数据目录
     * - ${home}: 用户主目录
     * - ${appPath}: 应用安装目录
     */
    private processMcpEnvVariables(mcpServers: any) {
        if (!mcpServers) return mcpServers;

        const processed = { ...mcpServers };
        const userData = app.getPath('userData');
        const home = app.getPath('home');
        const appPath = app.getAppPath();

        for (const [name, config] of Object.entries(processed)) {
            if (config && typeof config === 'object') {
                const mcpConfig: any = { ...config };

                // 处理 env 中的占位符
                if (mcpConfig.env) {
                    mcpConfig.env = Object.entries(mcpConfig.env).reduce(
                        (acc, [key, value]) => {
                            if (typeof value === 'string') {
                                acc[key] = value
                                    .replace(/\$\{userData\}/g, userData)
                                    .replace(/\$\{home\}/g, home)
                                    .replace(/\$\{appPath\}/g, appPath);
                            } else {
                                acc[key] = value;
                            }
                            return acc;
                        },
                        {} as Record<string, any>,
                    );
                }

                // 处理 command 中的占位符
                if (typeof mcpConfig.command === 'string') {
                    mcpConfig.command = mcpConfig.command
                        .replace(/\$\{userData\}/g, userData)
                        .replace(/\$\{home\}/g, home)
                        .replace(/\$\{appPath\}/g, appPath);
                }

                // 处理 args 中的占位符
                if (Array.isArray(mcpConfig.args)) {
                    mcpConfig.args = mcpConfig.args.map((arg: any) => {
                        if (typeof arg === 'string') {
                            return arg
                                .replace(/\$\{userData\}/g, userData)
                                .replace(/\$\{home\}/g, home)
                                .replace(/\$\{appPath\}/g, appPath);
                        }
                        return arg;
                    });
                }

                processed[name] = mcpConfig;
            }
        }

        return processed;
    }

    /**
     * 获取全局 MCP 配置
     */
    getGlobalMcpConfig(name?: string) {
        const agent = this.getAgent();
        return agent.getGlobalMcpConfig(name);
    }

    /**
     * 设置全局 MCP 配置
     */
    setGlobalMcpConfig(name: string, config: any) {
        const agent = this.getAgent();
        agent.setGlobalMcpConfig(name, config);
    }

    /**
     * 获取全局子代理
     */
    getGlobalSubAgents(name?: string) {
        const agent = this.getAgent();
        return agent.getGlobalSubAgents(name);
    }

    /**
     * 设置全局子代理
     */
    setGlobalSubAgents(name: string, agentDef: any) {
        const agent = this.getAgent();
        agent.setGlobalSubAgents(name, agentDef);
    }

    /**
     * 获取全局命令
     */
    getGlobalCommands(name?: string) {
        const agent = this.getAgent();
        return agent.getGlobalCommands(name);
    }

    /**
     * 设置全局命令
     */
    setGlobalCommands(name: string, command: string) {
        const agent = this.getAgent();
        agent.setGlobalCommands(name, command);
    }
}

export const claudeAgentService = new ClaudeAgentService();
