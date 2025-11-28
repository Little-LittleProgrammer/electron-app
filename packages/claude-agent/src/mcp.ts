import type { McpServerConfig } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, writeFileSync } from "fs";

export class GlobalMcpConfig {
    private basePath: string;

    constructor(basePath: string) {
        this.basePath = basePath + '/.mcp.json';
    }

    /**
     * 获取全局 MCP 配置
     * @returns 全局 MCP 配置
     * @example
     * ```json
     * {
     *     "mcpServers": {
     *         "mcpServer1": {
     *             "url": "https://api.mcpServer1.com"
     *         }
     *     }
     * }
     * ```
     */
    getGlobalMcpConfig(name?:string): McpServerConfig | Record<string, McpServerConfig> | null {
        let globalMcpConfig = readFileSync(this.basePath, 'utf-8');
        if (globalMcpConfig) {
            if (name) {
                return JSON.parse(globalMcpConfig).mcpServers[name];
            } else {
                return JSON.parse(globalMcpConfig).mcpServers;
            }
        } else {
            return null;
        }
    }

    /**
     * 写入全局 MCP 配置
     * @param config 全局 MCP 配置
     * @example
     * ```json
     * {
     *     "mcpServers": {
     *         "mcpServer1": {
     *             "url": "https://api.mcpServer1.com"
     *         }
     *     }
     * }
     * ```
     */
    setGlobalMcpConfig(name: string, config: McpServerConfig) {
        let globalMcpConfigDataStr = readFileSync(this.basePath, 'utf-8');
        if (globalMcpConfigDataStr) {
            let globalMcpConfigData = JSON.parse(globalMcpConfigDataStr);
            if (globalMcpConfigData.mcpServers) {
                globalMcpConfigData.mcpServers = { ...globalMcpConfigData.mcpServers, [name]: config };
            } else {
                globalMcpConfigData.mcpServers = { [name]: config };
            }
            writeFileSync(this.basePath, JSON.stringify(globalMcpConfigData, null, 2));
        } else {
            writeFileSync(this.basePath, JSON.stringify({
                "mcpServers": { [name]: config }
            }, null, 2));
        }
    }
}
