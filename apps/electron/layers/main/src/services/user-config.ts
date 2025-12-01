import { dirname } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';

export interface UserEnvConfig {
    baseURL?: string;
    apiKey?: string;
    model?: string;
    [key: string]: any;
}

const ensureDirectory = async (filePath: string) => {
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });
};

export const readUserEnvConfig = async (filePath: string): Promise<UserEnvConfig> => {
    try {
        const content = await readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return {};
        }
        throw error;
    }
};

export const writeUserEnvConfig = async (filePath: string, config: UserEnvConfig): Promise<UserEnvConfig> => {
    const current = await readUserEnvConfig(filePath);
    const nextConfig = {
        ...current,
        ...config,
    };

    await ensureDirectory(filePath);
    await writeFile(filePath, JSON.stringify(nextConfig, null, 2), 'utf-8');
    return nextConfig;
};
