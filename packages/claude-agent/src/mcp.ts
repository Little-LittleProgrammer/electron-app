import type { McpServerConfig } from '@anthropic-ai/claude-agent-sdk';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export class GlobalMcpConfig {
    private configPath: string;

    constructor(basePath: string) {
        this.configPath = join(basePath, '.mcp.json');
        this.ensureConfigFile();
    }

    private ensureConfigFile() {
        const dir = dirname(this.configPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        if (!existsSync(this.configPath)) {
            writeFileSync(
                this.configPath,
                JSON.stringify(
                    {
                        mcpServers: {},
                    },
                    null,
                    2,
                ),
                'utf-8',
            );
        }
    }

    private readConfig(): { mcpServers: Record<string, McpServerConfig> } {
        this.ensureConfigFile();
        const raw = readFileSync(this.configPath, 'utf-8');
        try {
            const parsed = JSON.parse(raw || '{}');
            return {
                mcpServers: parsed.mcpServers || {},
            };
        } catch (error) {
            // 如果文件损坏，重置为空结构避免崩溃
            writeFileSync(
                this.configPath,
                JSON.stringify(
                    {
                        mcpServers: {},
                    },
                    null,
                    2,
                ),
                'utf-8',
            );
            return { mcpServers: {} };
        }
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
    // 函数重载签名
    getGlobalMcpConfig(name: string): McpServerConfig | null;
    getGlobalMcpConfig(): Record<string, McpServerConfig> | null;
    getGlobalMcpConfig(name?: string): McpServerConfig | Record<string, McpServerConfig> | null {
        const { mcpServers } = this.readConfig();
        if (name) {
            return mcpServers[name] || null;
        }
        return mcpServers;
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
        const configData = this.readConfig();
        configData.mcpServers = {
            ...configData.mcpServers,
            [name]: config,
        };
        writeFileSync(this.configPath, JSON.stringify(configData, null, 2), 'utf-8');
    }
}
