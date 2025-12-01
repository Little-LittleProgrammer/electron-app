import { join, dirname } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { DEFAULT_PATH } from './claude-agent';

const MCP_FILE_PATH = join(DEFAULT_PATH, '.mcp.json');

const ensureMcpFile = async () => {
    const dir = dirname(MCP_FILE_PATH);
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }
    if (!existsSync(MCP_FILE_PATH)) {
        await writeFile(
            MCP_FILE_PATH,
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
};

export const readMcpFile = async () => {
    await ensureMcpFile();
    const content = await readFile(MCP_FILE_PATH, 'utf-8');
    return {
        path: MCP_FILE_PATH,
        content,
    };
};

export const writeMcpFile = async (rawContent: string) => {
    await ensureMcpFile();
    let parsed: any;
    try {
        parsed = JSON.parse(rawContent || '{}');
    } catch {
        throw new Error('mcp.json 必须是合法的 JSON');
    }
    const normalized = JSON.stringify(parsed, null, 2);
    await writeFile(MCP_FILE_PATH, normalized, 'utf-8');
    return {
        path: MCP_FILE_PATH,
        content: normalized,
    };
};
