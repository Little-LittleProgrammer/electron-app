export interface AgentConfig {
    baseURL: string;
    apiKey: string;
    model: string;
}

export interface PanelSystemEvent {
    title: string;
    content: string;
    level?: 'info' | 'success' | 'error';
}
