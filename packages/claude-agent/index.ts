import process from 'process';
import { query, type AgentDefinition, type McpServerConfig } from '@anthropic-ai/claude-agent-sdk';
import type { IAnthropicBaseOptions } from './src/types';
import { GlobalMcpConfig } from './src/mcp';
import { GlobalSubAgents } from './src/subAgents';
import { GlobalAgentCommands } from './src/commands';

export type ClaudeAgentQueryParams = Parameters<typeof query>[0];

export class ClaudeAgent {
    private aiBaseOptions: IAnthropicBaseOptions;
    private basePath: string;
    globalMcpConfig: GlobalMcpConfig;
    globalSubAgents: GlobalSubAgents;
    globalCommands: GlobalAgentCommands;

    constructor(aiBaseOptions: IAnthropicBaseOptions) {
        this.aiBaseOptions = aiBaseOptions;
        this.basePath = aiBaseOptions.basePath;
        this.globalMcpConfig = new GlobalMcpConfig(this.basePath);
        this.globalSubAgents = new GlobalSubAgents(this.basePath);
        this.globalCommands = new GlobalAgentCommands(this.basePath);
        this.init();
    }

    // 权限校验，调用服务器获取 ANTHROPIC_BASE_URL，ANTHROPIC_API_KEY
    init() {
        if (this.aiBaseOptions.baseURL && this.aiBaseOptions.apiKey) {
            process.env.ANTHROPIC_BASE_URL = this.aiBaseOptions.baseURL;
            process.env.ANTHROPIC_API_KEY = this.aiBaseOptions.apiKey;
            process.env.ANTHROPIC_MODEL = this.aiBaseOptions.model;
        }
    }

    query(promptOrOptions: string | ClaudeAgentQueryParams): ReturnType<typeof query> {
        if (typeof promptOrOptions === 'string') {
            return query({
                prompt: promptOrOptions,
            });
        }

        return query(promptOrOptions);
    }

    getGlobalMcpConfig(name?: string): McpServerConfig | Record<string, McpServerConfig> | null {
        return this.globalMcpConfig.getGlobalMcpConfig(name);
    }

    getGlobalSubAgents(name?: string): string | Record<string, string> | null {
        return this.globalSubAgents.getGlobalSubAgents(name);
    }

    getGlobalCommands(name?: string): string | Record<string, string> | null {
        return this.globalCommands.getGlobalCommands(name);
    }

    setGlobalMcpConfig(name: string, config: McpServerConfig) {
        this.globalMcpConfig.setGlobalMcpConfig(name, config);
    }

    setGlobalSubAgents(name: string, agent: AgentDefinition) {
        this.globalSubAgents.setGlobalSubAgent(name, agent);
    }

    setGlobalCommands(name: string, command: string) {
        this.globalCommands.setGlobalCommands(name, command);
    }
}
