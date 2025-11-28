import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "fs";

export class GlobalSubAgents {
    private basePath: string;

    constructor(basePath: string) {
        this.basePath = basePath + '/.claude/agents';
    }

    getGlobalSubAgents(name?: string): string | Record<string, string> | null {
        if (!existsSync(this.basePath)) {
            return null;
        }
        if (name) {
            const context = readFileSync(`${this.basePath}/${name.includes('.md') ? name : name + '.md'}`, 'utf-8');
            if (context) {
                return context;
            } else {
                return null;
            }
        } else {
            const files = readdirSync(this.basePath);
            const result: Record<string, string> = {};
            files.forEach((file: string) => {
                const context = readFileSync(`${this.basePath}/${file}}`, 'utf-8');
                if (context) {
                    result[file.replace('.md', '')] = context;
                } 
            });
            return result;
        }
    }

    /**
     * 设置子代理
     * @param name 子代理名称
     * @param agent 子代理配置
     * @example
     * ```json
     * {
     *     "name": "mcpServer1",
     *     "url": "https://api.mcpServer1.com"
     * }
     * ```
     */
    setGlobalSubAgent(name: string, agent: AgentDefinition) {
        if (!existsSync(this.basePath)) {
            mkdirSync(this.basePath, { recursive: true });
        }
        const { description = '', tools = ['Read', 'Grep', 'Glob', 'Bash', 'Write', 'Edit'], prompt = '' } = agent;
        const context = `
        ---
        name: ${name}
        description: ${description}
        tools: ${tools.join(', ')}
        ---
        ${prompt}
        `
        writeFileSync(`${this.basePath}/${name.includes('.md') ? name : name + '.md'}`, context);
    }
}
