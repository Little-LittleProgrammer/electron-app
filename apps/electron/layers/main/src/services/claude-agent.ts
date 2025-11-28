import { ClaudeAgent, type ClaudeAgentQueryParams } from '@electron-app/claude-agent';
import { app } from 'electron';
import { join } from 'path';
import type { IAnthropicBaseOptions } from '@electron-app/claude-agent/src/types';

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
        const basePath = options?.basePath || join(app.getPath('userData'), 'claude-agent');

        const defaultOptions: IAnthropicBaseOptions = {
            basePath,
            baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
            apiKey: process.env.ANTHROPIC_API_KEY || '',
            model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
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
     * 查询 AI（支持字符串 prompt 或完整配置）
     */
    async query(promptOrOptions: string | ClaudeAgentQueryParams) {
        const agent = this.getAgent();
        const stream = agent.query(promptOrOptions) as AsyncIterable<any>;
        let finalResult: any = null;

        for await (const message of stream) {
            if (message.type === 'result') {
                console.log('message', message);
                finalResult = message.result;
            }
        }

        if (finalResult === null) {
            throw new Error('Claude Agent 未返回 result 消息');
        }

        return finalResult;
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
