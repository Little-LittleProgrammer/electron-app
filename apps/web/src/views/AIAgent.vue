<template>
    <div class="ai-agent-container">
        <div class="mx-auto max-w-6xl p-6">
            <!-- 头部 -->
            <div class="mb-8">
                <h1 class="mb-2 text-3xl font-bold text-gray-800">AI Agent 助手</h1>
                <p class="text-gray-600">基于 Claude 的智能对话助手，支持 MCP 服务器和子代理配置</p>
            </div>

            <!-- 配置区域 -->
            <div class="mb-6 rounded-lg bg-white p-6 shadow-md">
                <h2 class="mb-4 flex items-center text-xl font-semibold">
                    <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    配置信息
                </h2>
                <div class="space-y-4">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <label class="mb-2 block text-sm font-medium text-gray-700">API 地址</label>
                            <input v-model="config.baseURL" type="text" class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="https://api.anthropic.com" />
                        </div>
                        <div>
                            <label class="mb-2 block text-sm font-medium text-gray-700">API Key</label>
                            <input v-model="config.apiKey" type="password" class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="sk-ant-..." />
                        </div>
                        <div>
                            <label class="mb-2 block text-sm font-medium text-gray-700">模型</label>
                            <input v-model="config.model" type="text" class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="claude-3-5-sonnet-20241022" />
                        </div>
                    </div>
                    <button @click="initializeAgent" :disabled="isInitializing" class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400">
                        {{ isInitializing ? '初始化中...' : '初始化 Agent' }}
                    </button>
                </div>
            </div>

            <!-- 聊天区域 -->
            <div class="overflow-hidden rounded-lg bg-white shadow-md">
                <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                    <h2 class="flex items-center text-xl font-semibold text-white">
                        <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        对话窗口
                    </h2>
                </div>

                <!-- 消息列表 -->
                <div ref="messageContainer" class="h-96 overflow-y-auto bg-gray-50 p-6">
                    <div v-if="messages.length === 0" class="mt-20 text-center text-gray-500">
                        <svg class="mx-auto mb-4 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p>开始与 AI 助手对话吧...</p>
                    </div>

                    <div v-for="(msg, index) in messages" :key="index" class="mb-4">
                        <div :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
                            <div :class="['max-w-3xl rounded-lg px-4 py-3 shadow', msg.role === 'user' ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-800']">
                                <div class="mb-1 flex items-center">
                                    <span class="text-xs font-semibold opacity-75">
                                        {{ msg.role === 'user' ? '你' : 'AI 助手' }}
                                    </span>
                                    <span class="ml-2 text-xs opacity-50">{{ msg.timestamp }}</span>
                                </div>
                                <div class="whitespace-pre-wrap text-sm">{{ msg.content }}</div>
                            </div>
                        </div>
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

            <!-- 功能按钮区域 -->
            <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <button @click="clearMessages" class="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300">清空对话</button>
                <button @click="showMcpConfig" class="rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700">查看 MCP 配置</button>
                <button @click="showSubAgents" class="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700">查看子代理</button>
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
import { ref, nextTick } from 'vue';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface AgentConfig {
    baseURL: string;
    apiKey: string;
    model: string;
}

// 状态
const config = ref<AgentConfig>({
    baseURL: 'https://api.anthropic.com',
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
});

const messages = ref<Message[]>([]);
const userInput = ref('');
const isLoading = ref(false);
const isInitializing = ref(false);
const error = ref('');
const messageContainer = ref<HTMLElement | null>(null);

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
    } finally {
        isInitializing.value = false;
    }
};

// 发送消息
const sendMessage = async () => {
    if (!userInput.value.trim() || isLoading.value) return;

    const prompt = userInput.value.trim();
    userInput.value = '';

    // 添加用户消息
    addMessage('user', prompt);

    isLoading.value = true;
    error.value = '';

    try {
        if (!window.electronAPI) {
            throw new Error('Electron API 未加载');
        }

        const response = await window.electronAPI.claudeAgent.query(prompt);

        // 添加 AI 回复
        addMessage('assistant', response || '收到回复但内容为空');
    } catch (err: any) {
        error.value = err.message || '查询失败';
        addMessage('assistant', `抱歉，发生错误：${error.value}`);
        console.error('查询失败:', err);
    } finally {
        isLoading.value = false;
    }
};

// 添加消息
const addMessage = (role: 'user' | 'assistant', content: string) => {
    messages.value.push({
        role,
        content,
        timestamp: new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
        }),
    });

    // 滚动到底部
    nextTick(() => {
        if (messageContainer.value) {
            messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
        }
    });
};

// 清空对话
const clearMessages = () => {
    messages.value = [];
    error.value = '';
};

// 查看 MCP 配置
const showMcpConfig = async () => {
    try {
        if (!window.electronAPI) {
            throw new Error('Electron API 未加载');
        }

        const mcpConfig = await window.electronAPI.claudeAgent.getMcpConfig();
        addMessage('assistant', `MCP 配置：\n${JSON.stringify(mcpConfig, null, 2)}`);
    } catch (err: any) {
        error.value = err.message || '获取 MCP 配置失败';
    }
};

// 查看子代理
const showSubAgents = async () => {
    try {
        if (!window.electronAPI) {
            throw new Error('Electron API 未加载');
        }

        const subAgents = await window.electronAPI.claudeAgent.getSubAgents();
        addMessage('assistant', `子代理配置：\n${JSON.stringify(subAgents, null, 2)}`);
    } catch (err: any) {
        error.value = err.message || '获取子代理配置失败';
    }
};
</script>

<style scoped>
.ai-agent-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem 0;
}
</style>
