<template>
    <div class="ai-agent-container">
        <agent-config-panel :visible="isConfigPanelOpen" :config="config" :is-initializing="isInitializing" :is-saving="isSavingConfig" @close="isConfigPanelOpen = false" @update:config="handleConfigUpdate" @initialize="initializeAgent" @save="handleSaveAgentConfig" @system-event="handlePanelSystemEvent" />
        <button type="button" class="floating-settings-btn" @click="isConfigPanelOpen = true" aria-label="打开配置面板">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11.049 2.927c.3-1.14 1.938-1.14 2.238 0a1.724 1.724 0 002.591 1.046c1.01-.59 2.212.613 1.622 1.623a1.724 1.724 0 001.046 2.59c1.14.3 1.14 1.939 0 2.239a1.724 1.724 0 00-1.046 2.591c.59 1.01-.612 2.212-1.622 1.622a1.724 1.724 0 00-2.591 1.046c-.3 1.14-1.938 1.14-2.238 0a1.724 1.724 0 00-2.591-1.046c-1.01.59-2.212-.612-1.622-1.622a1.724 1.724 0 00-1.046-2.591c-1.14-.3-1.14-1.939 0-2.239a1.724 1.724 0 001.046-2.59c-.59-1.01.612-2.213 1.622-1.623a1.724 1.724 0 002.591-1.046z"
                />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>设置</span>
        </button>
        <div class="mx-auto box-border flex h-full max-w-6xl flex-col py-2">
            <!-- 头部 -->
            <div class="mb-8">
                <h1 class="mb-2 text-3xl font-bold text-gray-800">AI Agent 助手</h1>
                <p class="text-gray-600">基于 Claude 的智能对话助手，支持 MCP 服务器和子代理配置</p>
            </div>

            <!-- 聊天区域 -->
            <div class="flex flex-1 flex-col overflow-hidden rounded-lg bg-white shadow-md">
                <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                    <h2 class="flex items-center text-xl font-semibold text-white">
                        <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        对话窗口
                    </h2>
                </div>

                <!-- 消息列表 -->
                <div ref="messageContainer" class="flex-1 overflow-y-auto bg-gray-50 p-6">
                    <div v-if="timelineEntries.length === 0" class="mt-20 text-center text-gray-500">
                        <svg class="mx-auto mb-4 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p>开始与 AI 助手对话吧...</p>
                    </div>

                    <div v-for="entry in timelineEntries" :key="entry.id" class="mb-4">
                        <template v-if="entry.type === 'user'">
                            <div :class="['flex', entry.role === 'user' ? 'justify-end' : 'justify-start']">
                                <div :class="['max-w-3xl rounded-lg px-4 py-3 shadow', entry.role === 'user' ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-800']">
                                    <div class="mb-1 flex items-center">
                                        <span class="text-xs font-semibold opacity-75">
                                            {{ entry.role === 'user' ? '你' : 'AI 助手' }}
                                        </span>
                                        <span class="ml-2 text-xs opacity-50">{{ entry.timestamp }}</span>
                                    </div>
                                    <div class="whitespace-pre-wrap text-sm">{{ entry.content }}</div>
                                </div>
                            </div>
                        </template>
                        <template v-else-if="entry.type === 'assistant'">
                            <details class="group rounded-lg border border-blue-200 bg-white p-4 shadow-sm transition hover:border-blue-300">
                                <summary class="flex cursor-pointer list-none items-center justify-between">
                                    <div class="flex flex-col">
                                        <span class="text-sm font-semibold text-blue-700">AI 助手</span>
                                        <span class="text-xs text-gray-500">{{ entry.content.slice(0, 50) }}{{ entry.content.length > 50 ? '...' : '' }}</span>
                                    </div>
                                    <span class="text-xs text-gray-400">{{ entry.timestamp }}</span>
                                </summary>
                                <div class="mt-3 whitespace-pre-wrap text-gray-700">
                                    {{ entry.content }}
                                </div>
                            </details>
                        </template>
                        <template v-else>
                            <div class="max-w-3xl">
                                <details v-if="entry.type === 'thinking'" class="group rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 shadow-sm transition hover:border-gray-300">
                                    <summary class="flex cursor-pointer list-none items-center justify-between text-gray-500">
                                        <span class="flex items-center space-x-2">
                                            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-3-3v6m9 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>思考过程</span>
                                        </span>
                                        <span class="text-xs text-gray-400">{{ entry.timestamp }}</span>
                                    </summary>
                                    <div class="mt-3 whitespace-pre-wrap text-gray-600">
                                        {{ entry.content || '（空）' }}
                                    </div>
                                </details>

                                <details v-else-if="entry.type === 'tool_call'" class="group rounded-lg border border-amber-200 bg-white p-4 shadow-sm transition hover:border-amber-300">
                                    <summary class="flex cursor-pointer list-none items-center justify-between">
                                        <div class="flex flex-col">
                                            <span class="text-sm font-semibold text-amber-700">{{ entry.title }}</span>
                                            <span v-if="entry.subtitle" class="text-xs text-gray-500">{{ entry.subtitle }}</span>
                                        </div>
                                        <span class="text-xs text-gray-400">{{ entry.timestamp }}</span>
                                    </summary>
                                    <div class="mt-3 space-y-3">
                                        <div>
                                            <div class="text-xs font-semibold uppercase text-gray-500">请求参数</div>
                                            <pre class="mt-1 overflow-x-auto rounded bg-gray-50 p-3 text-xs text-gray-700">{{ entry.content }}</pre>
                                        </div>
                                        <div v-if="entry.toolResult">
                                            <div class="text-xs font-semibold uppercase text-gray-500">调用结果</div>
                                            <pre class="mt-1 overflow-x-auto rounded bg-green-50 p-3 text-xs text-gray-800">{{ entry.toolResult }}</pre>
                                        </div>
                                    </div>
                                </details>

                                <details v-else-if="entry.type === 'system'" class="group rounded-lg border border-blue-200 bg-white p-4 text-sm text-gray-700 shadow-sm transition hover:border-blue-300">
                                    <summary class="flex cursor-pointer list-none items-center justify-between">
                                        <div class="flex flex-col">
                                            <span class="text-sm font-semibold text-blue-700">{{ entry.title }}</span>
                                            <span v-if="entry.subtitle" class="text-xs text-gray-500">{{ entry.subtitle }}</span>
                                        </div>
                                        <span class="text-xs text-gray-400">{{ entry.timestamp }}</span>
                                    </summary>
                                    <div class="mt-3 whitespace-pre-wrap text-gray-700">
                                        {{ entry.content }}
                                    </div>
                                </details>

                                <div v-else class="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
                                    <div class="mb-1 flex items-center justify-between text-xs text-gray-500">
                                        <span>{{ entry.title }}</span>
                                        <span>{{ entry.timestamp }}</span>
                                    </div>
                                    <p class="whitespace-pre-wrap">{{ entry.content }}</p>
                                </div>
                            </div>
                        </template>
                    </div>

                    <!-- 加载状态 -->
                    <div v-if="isLoading" class="mb-4 flex justify-start">
                        <div class="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow">
                            <div class="flex items-center space-x-2">
                                <div class="h-2 w-2 animate-bounce rounded-full bg-blue-600"></div>
                                <div class="h-2 w-2 animate-bounce rounded-full bg-blue-600" style="animation-delay: 0.2s"></div>
                                <div class="h-2 w-2 animate-bounce rounded-full bg-blue-600" style="animation-delay: 0.4s"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 输入区域 -->
                <div class="border-t border-gray-200 bg-white p-4">
                    <div class="flex space-x-4">
                        <input v-model="userInput" @keyup.enter="sendMessage" type="text" :disabled="isLoading" class="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" placeholder="输入你的问题..." />
                        <div class="flex space-x-2">
                            <button @click="clearMessages" class="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300">清空对话</button>
                            <button @click="sendMessage" :disabled="isLoading || !userInput.trim()" class="flex items-center rounded-lg bg-blue-600 px-8 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400">
                                <svg v-if="!isLoading" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                <span v-if="!isLoading">发送</span>
                                <span v-else>发送中...</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 错误提示 -->
            <div v-if="error" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <div class="flex items-center">
                    <svg class="mr-2 h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="font-medium text-red-800">错误：</span>
                </div>
                <p class="mt-2 text-red-700">{{ error }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, onMounted } from 'vue';
import AgentConfigPanel from '@/components/AgentConfigPanel.vue';
import type { AgentConfig, PanelSystemEvent } from '@/types/agent';

type AgentEventType = 'user' | 'assistant' | 'system' | 'thinking' | 'tool_call' | 'tool_result' | 'result';

interface TimelineEntry {
    id: string;
    type: AgentEventType;
    title?: string;
    content: string;
    timestamp: string;
    createdAt: number;
    role?: 'user' | 'assistant';
    subtitle?: string;
    raw?: string;
    metadata?: Record<string, any>;
    toolResult?: string;
}

// 状态
const config = ref<AgentConfig>({
    baseURL: 'https://api.deepseek.com/anthropic',
    apiKey: '',
    model: 'deepseek-chat',
});

const timeline = ref<TimelineEntry[]>([]);
const userInput = ref('');
const isLoading = ref(false);
const isInitializing = ref(false);
const isSavingConfig = ref(false);
const error = ref('');
const messageContainer = ref<HTMLElement | null>(null);
const isConfigPanelOpen = ref(false);
let assistantMessageActive = false;

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatTimestamp = () =>
    new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

const safeStringify = (value: any) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
};

const handleConfigUpdate = (value: AgentConfig) => {
    config.value = {
        ...config.value,
        ...value,
    };
};

const handleSaveAgentConfig = async (nextConfig: AgentConfig) => {
    if (!window.electronAPI?.userConfig) {
        const message = 'Electron API 未加载，无法保存配置';
        error.value = message;
        addEventEntry('system', '保存配置失败', message);
        return;
    }

    isSavingConfig.value = true;
    error.value = '';

    try {
        const result = await window.electronAPI.userConfig.save(nextConfig);
        const saved = result?.config ?? nextConfig;
        config.value = {
            ...config.value,
            ...saved,
        };
        addEventEntry('system', '配置已保存', `配置文件：${result?.path || '用户目录/.env.json'}`, { raw: result });
        isConfigPanelOpen.value = false;
    } catch (err: any) {
        const message = err.message || '保存配置失败';
        error.value = message;
        addEventEntry('system', '保存配置失败', message, { raw: err });
    } finally {
        isSavingConfig.value = false;
    }
};

const handlePanelSystemEvent = (payload: PanelSystemEvent) => {
    addEventEntry('system', payload.title || '设置事件', payload.content || '', {
        subtitle: payload.level ? `状态：${payload.level}` : undefined,
    });
};

const loadSavedAgentConfig = async () => {
    if (!window.electronAPI?.userConfig) {
        return;
    }

    try {
        const stored = (await window.electronAPI.userConfig.get()) as Partial<AgentConfig> | null;
        if (stored && Object.keys(stored).length > 0) {
            config.value = {
                baseURL: stored.baseURL || config.value.baseURL,
                apiKey: stored.apiKey || config.value.apiKey,
                model: stored.model || config.value.model,
            };
            addEventEntry('system', '加载用户配置', '已从本地配置文件加载 Agent 设置', { raw: stored });
        }
    } catch (err: any) {
        const message = err.message || '读取配置失败';
        addEventEntry('system', '读取配置失败', message, { raw: err });
    }
};

const timelineEntries = computed<TimelineEntry[]>(() => [...timeline.value].sort((a, b) => a.createdAt - b.createdAt));

const scrollMessagesToBottom = () => {
    nextTick(() => {
        if (messageContainer.value) {
            messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
        }
    });
};

onMounted(() => {
    void loadSavedAgentConfig();
});

const addEventEntry = (type: AgentEventType, title: string, content: string, options?: { subtitle?: string; raw?: any; metadata?: Record<string, any>; toolResult?: string }) => {
    const entry: TimelineEntry = {
        id: createId(),
        type,
        title,
        content,
        timestamp: formatTimestamp(),
        createdAt: Date.now(),
        subtitle: options?.subtitle,
        raw: options?.raw ? safeStringify(options.raw) : undefined,
        metadata: options?.metadata,
        toolResult: options?.toolResult,
    };
    timeline.value.push(entry);
    scrollMessagesToBottom();
    return entry;
};

const describeSystemEvent = (payload: any) => {
    if (payload?.subtype === 'init') {
        return [`工作目录：${payload.cwd || '未知'}`, `模型：${payload.model || '未设置'}`, `权限模式：${payload.permissionMode || 'default'}`, `可用工具：${payload.tools?.join(', ') || '未设置'}`].join('\n');
    }
    return safeStringify(payload);
};

const resetAssistantStreamState = () => {
    assistantMessageActive = false;
};

// 添加消息
const addMessage = (role: 'user' | 'assistant', content: string, newMessage: boolean = true) => {
    const timestamp = formatTimestamp();
    const createdAt = Date.now();
    const lastEntry = timeline.value[timeline.value.length - 1];
    const canAppendLast = !newMessage && lastEntry && lastEntry.type === role && lastEntry.role === role;

    if (canAppendLast) {
        lastEntry.content += content;
        lastEntry.timestamp = timestamp;
        lastEntry.createdAt = createdAt;
    } else {
        timeline.value.push({
            id: createId(),
            type: role,
            role,
            content,
            timestamp,
            createdAt,
        });
    }

    scrollMessagesToBottom();
};

const appendAssistantText = (text: string) => {
    if (!text) return;
    const lastMessage = timeline.value[timeline.value.length - 1];
    const shouldStartNew = !assistantMessageActive || !lastMessage || lastMessage.role !== 'assistant';
    addMessage('assistant', text, shouldStartNew);
    assistantMessageActive = true;
};

const handleAssistantMessage = (payload: any) => {
    const contentList: any[] = payload?.message?.content ?? [];
    contentList.forEach((item) => {
        if (item.type === 'thinking') {
            addEventEntry('thinking', '思考过程', item.thinking || '（空）', { raw: item });
        } else if (item.type === 'tool_use') {
            const toolUseId = item.id || item.tool_use_id;
            addEventEntry('tool_call', '工具调用', safeStringify(item.input ?? {}), {
                subtitle: item.name ? `工具：${item.name}` : undefined,
                raw: item,
                metadata: toolUseId ? { toolUseId } : undefined,
            });
        } else if (item.type === 'text') {
            appendAssistantText(item.text || '');
        }
    });
};

const handleUserEvent = (payload: any) => {
    const contentList: any[] = payload?.message?.content ?? [];
    contentList.forEach((item) => {
        if (item.type === 'tool_result') {
            const toolContent = typeof item.content === 'string' ? item.content : safeStringify(item.content ?? {});
            const toolUseId = item.tool_use_id;
            if (toolUseId) {
                const target = [...timeline.value].reverse().find((event) => event.metadata?.toolUseId === toolUseId);
                if (target) {
                    target.toolResult = toolContent;
                    target.timestamp = formatTimestamp();
                    target.raw = safeStringify(item);
                    return;
                }
            }
            addEventEntry('tool_result', '工具返回', toolContent, { raw: item });
        } else if (item.type === 'text' && item.text) {
            addEventEntry('user', '用户反馈', item.text, { raw: item });
        }
    });
};

const handleResultEvent = (payload: any) => {
    const resultText = typeof payload?.result === 'string' ? payload.result : safeStringify(payload?.result ?? {});
    addEventEntry('result', '最终结果', resultText, { raw: payload });
    if (!assistantMessageActive && resultText) {
        addMessage('assistant', resultText);
    }
    resetAssistantStreamState();
};

const handleStreamMessage = (payload: any) => {
    console.log('payload', payload);
    switch (payload?.type) {
        case 'system':
            addEventEntry('system', payload.subtype === 'init' ? '会话初始化' : '系统事件', describeSystemEvent(payload), { raw: payload });
            break;
        case 'assistant':
            handleAssistantMessage(payload);
            break;
        case 'user':
            handleUserEvent(payload);
            break;
        case 'result':
            handleResultEvent(payload);
            break;
        default:
            addEventEntry('system', '其他事件', safeStringify(payload), { raw: payload });
    }
};

// 初始化 Agent
const initializeAgent = async () => {
    isInitializing.value = true;
    error.value = '';

    try {
        if (!window.electronAPI) {
            throw new Error('Electron API 未加载，请在 Electron 环境中运行');
        }

        const result = await window.electronAPI.claudeAgent.initialize({
            baseURL: config.value.baseURL,
            apiKey: config.value.apiKey,
            model: config.value.model,
        });

        if (result.success) {
            addMessage('assistant', 'Agent 初始化成功！你可以开始对话了。');
        }
    } catch (err: any) {
        error.value = err.message || '初始化失败';
        console.error('初始化 Agent 失败:', err);
        addEventEntry('system', '初始化失败', error.value, { raw: err });
    } finally {
        isInitializing.value = false;
    }
};

// 发送消息
const sendMessage = async () => {
    if (!userInput.value.trim() || isLoading.value) return;

    const prompt = userInput.value.trim();
    userInput.value = '';

    addMessage('user', prompt);
    addEventEntry('user', '用户提问', prompt, { raw: { prompt } });
    resetAssistantStreamState();

    isLoading.value = true;
    error.value = '';

    try {
        if (!window.electronAPI) {
            throw new Error('Electron API 未加载');
        }

        const stream = window.electronAPI.claudeAgent.query({
            prompt,
        });

        for await (const message of stream) {
            handleStreamMessage(message);
        }
    } catch (err: any) {
        error.value = err.message || '查询失败';
        addMessage('assistant', `抱歉，发生错误：${error.value}`);
        addEventEntry('system', '查询失败', error.value, { raw: err });
        console.error('查询失败:', err);
    } finally {
        isLoading.value = false;
        resetAssistantStreamState();
    }
};

// 清空对话
const clearMessages = () => {
    timeline.value = [];
    error.value = '';
    resetAssistantStreamState();
};

// 查看子代理
const showSubAgents = async () => {
    try {
        if (!window.electronAPI) {
            throw new Error('Electron API 未加载');
        }

        const subAgents = await window.electronAPI.claudeAgent.getSubAgents();
        const subAgentText = JSON.stringify(subAgents, null, 2);
        addMessage('assistant', `子代理配置：\n${subAgentText}`);
        addEventEntry('system', '子代理配置', subAgentText, { raw: subAgents });
    } catch (err: any) {
        error.value = err.message || '获取子代理配置失败';
        addEventEntry('system', '获取子代理失败', error.value, { raw: err });
    }
};
</script>

<style scoped>
.ai-agent-container {
    min-height: 100vh;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.floating-settings-btn {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    border-radius: 999px;
    padding: 0.65rem 1.1rem;
    background: rgba(255, 255, 255, 0.9);
    color: #4338ca;
    font-weight: 600;
    box-shadow: 0 15px 35px rgba(59, 130, 246, 0.25);
    cursor: pointer;
    z-index: 40;
    transition:
        transform 0.2s,
        box-shadow 0.2s;
}

.floating-settings-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(59, 130, 246, 0.35);
}

.floating-settings-btn svg {
    color: #4338ca;
}
</style>
