import type { AgentDefinition, McpServerConfig } from "@anthropic-ai/claude-agent-sdk";

export interface IAnthropicBaseOptions {
    basePath: string; // 用户数据存放目录
    baseURL: string; // Anthropic API 地址
    apiKey: string; // Anthropic API 密钥
    model: string; // Anthropic API 模型
    globalMcpConfig: Record<string, McpServerConfig>; // 全局 MCP 配置
    subAgents: Record<string, AgentDefinition>; // 子代理配置
}
