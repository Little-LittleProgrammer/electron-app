import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";

export class GlobalAgentCommands {
    private basePath: string;

    constructor(basePath: string) {
        this.basePath = basePath + '/.claude/commands';
    }

    getGlobalCommands(name?: string): string | Record<string, string> | null {
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

    setGlobalCommands(name: string, command: string) {
        if (!existsSync(this.basePath)) {
            mkdirSync(this.basePath, { recursive: true });
        }
        writeFileSync(`${this.basePath}/${name.includes('.md') ? name : name + '.md'}`, command);
    }
}
