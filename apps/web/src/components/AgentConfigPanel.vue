<template>
    <Teleport to="body">
        <transition name="agent-config-fade">
            <div v-if="visible" class="agent-config-overlay" @click.self="handleClose">
                <div class="agent-config-panel">
                    <div class="panel-header">
                        <div>
                            <p class="panel-subtitle">连接 Claude Agent</p>
                            <h2 class="panel-title">配置信息</h2>
                        </div>
                        <button type="button" class="icon-button" @click="handleClose" aria-label="关闭配置面板">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>

                    <form class="panel-body" @submit.prevent="handleSave">
                        <label class="input-group">
                            <span>API 地址</span>
                            <input :value="localConfig.baseURL" type="text" class="input" placeholder="https://api.anthropic.com" @input="updateField('baseURL', ($event.target as HTMLInputElement).value)" />
                        </label>

                        <label class="input-group">
                            <span>API Key</span>
                            <input :value="localConfig.apiKey" type="password" class="input" placeholder="sk-ant-..." @input="updateField('apiKey', ($event.target as HTMLInputElement).value)" />
                        </label>

                        <label class="input-group">
                            <span>模型</span>
                            <input :value="localConfig.model" type="text" class="input" placeholder="claude-3-5-sonnet-20241022" @input="updateField('model', ($event.target as HTMLInputElement).value)" />
                        </label>

                        <div class="panel-actions">
                            <button type="submit" class="btn btn-primary" :disabled="isSaving">
                                {{ isSaving ? '保存中...' : '保存配置' }}
                            </button>
                            <button type="button" class="btn btn-secondary" :disabled="isInitializing" @click="handleInitialize">
                                {{ isInitializing ? '初始化中...' : '初始化 Agent' }}
                            </button>
                        </div>
                    </form>

                    <div class="panel-divider"></div>

                    <section class="panel-section">
                        <div class="section-header">
                            <div>
                                <p class="section-subtitle">MCP</p>
                                <h3 class="section-title">.mcp.json</h3>
                            </div>
                            <button type="button" class="text-button" :disabled="isLoadingMcp" @click="loadMcpFile">
                                {{ isLoadingMcp ? '加载中...' : '刷新' }}
                            </button>
                        </div>
                        <p v-if="mcpPath" class="section-path">存储路径：{{ mcpPath }}</p>
                        <textarea v-model="mcpContent" class="code-textarea" rows="8" placeholder='{ "mcpServers": {} }'></textarea>
                        <div class="section-actions">
                            <button type="button" class="btn btn-primary" :disabled="isSavingMcp || !mcpContent.trim()" @click="saveMcpFile">
                                {{ isSavingMcp ? '保存中...' : '保存 .mcp.json' }}
                            </button>
                        </div>
                        <p v-if="mcpError" class="section-error">{{ mcpError }}</p>
                    </section>

                    <section class="panel-section">
                        <div class="section-header">
                            <div>
                                <p class="section-subtitle">子代理</p>
                                <h3 class="section-title">Sub Agents</h3>
                            </div>
                            <button type="button" class="text-button" :disabled="isLoadingSubAgents" @click="() => loadSubAgents()">
                                {{ isLoadingSubAgents ? '加载中...' : '刷新' }}
                            </button>
                        </div>

                        <div class="selection-grid">
                            <label class="input-group">
                                <span>已有子代理</span>
                                <select v-model="selectedSubAgent" class="input select" :disabled="subAgentOptions.length === 0">
                                    <option value="" disabled>请选择</option>
                                    <option v-for="name in subAgentOptions" :key="name" :value="name">{{ name }}</option>
                                </select>
                            </label>
                            <label class="input-group">
                                <span>新增名称（可选）</span>
                                <input v-model="newSubAgentName" type="text" class="input" placeholder="例如: repo-helper" />
                            </label>
                        </div>

                        <textarea v-model="subAgentContent" class="code-textarea" rows="6" placeholder="Markdown / Prompt 内容"></textarea>

                        <div class="section-actions">
                            <button type="button" class="btn btn-secondary" :disabled="isSavingSubAgent || (!selectedSubAgent && !newSubAgentName.trim())" @click="saveSubAgent">
                                {{ isSavingSubAgent ? '保存中...' : '保存子代理' }}
                            </button>
                        </div>
                        <p v-if="subAgentError" class="section-error">{{ subAgentError }}</p>
                    </section>

                    <section class="panel-section">
                        <div class="section-header">
                            <div>
                                <p class="section-subtitle">命令</p>
                                <h3 class="section-title">Agent Commands</h3>
                            </div>
                            <button type="button" class="text-button" :disabled="isLoadingCommands" @click="() => loadCommands()">
                                {{ isLoadingCommands ? '加载中...' : '刷新' }}
                            </button>
                        </div>

                        <div class="selection-grid">
                            <label class="input-group">
                                <span>已有命令</span>
                                <select v-model="selectedCommand" class="input select" :disabled="commandOptions.length === 0">
                                    <option value="" disabled>请选择</option>
                                    <option v-for="name in commandOptions" :key="name" :value="name">{{ name }}</option>
                                </select>
                            </label>
                            <label class="input-group">
                                <span>新增名称（可选）</span>
                                <input v-model="newCommandName" type="text" class="input" placeholder="例如: sync-project" />
                            </label>
                        </div>

                        <textarea v-model="commandContent" class="code-textarea" rows="6" placeholder="Shell/CLI 命令内容"></textarea>

                        <div class="section-actions">
                            <button type="button" class="btn btn-secondary" :disabled="isSavingCommand || (!selectedCommand && !newCommandName.trim())" @click="saveCommand">
                                {{ isSavingCommand ? '保存中...' : '保存命令' }}
                            </button>
                        </div>
                        <p v-if="commandError" class="section-error">{{ commandError }}</p>
                    </section>
                </div>
            </div>
        </transition>
    </Teleport>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed, watch } from 'vue';
import type { PropType } from 'vue';
import type { AgentConfig, PanelSystemEvent } from '@/types/agent';

export default defineComponent({
    name: 'AgentConfigPanel',
    props: {
        visible: {
            type: Boolean,
            default: false,
        },
        config: {
            type: Object as PropType<AgentConfig>,
            required: true,
        },
        isInitializing: {
            type: Boolean,
            default: false,
        },
        isSaving: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['close', 'update:config', 'initialize', 'save', 'systemEvent'],
    setup(props, { emit }) {
        const localConfig = reactive<AgentConfig>({ ...props.config });

        const mcpPath = ref('');
        const mcpContent = ref('');
        const mcpError = ref('');
        const isLoadingMcp = ref(false);
        const isSavingMcp = ref(false);

        const subAgents = ref<Record<string, string>>({});
        const selectedSubAgent = ref('');
        const newSubAgentName = ref('');
        const subAgentContent = ref('');
        const subAgentError = ref('');
        const isLoadingSubAgents = ref(false);
        const isSavingSubAgent = ref(false);

        const commands = ref<Record<string, string>>({});
        const selectedCommand = ref('');
        const newCommandName = ref('');
        const commandContent = ref('');
        const commandError = ref('');
        const isLoadingCommands = ref(false);
        const isSavingCommand = ref(false);

        const subAgentOptions = computed(() => Object.keys(subAgents.value));
        const commandOptions = computed(() => Object.keys(commands.value));

        const emitSystemEvent = (payload: PanelSystemEvent) => {
            emit('systemEvent', payload);
        };

        const formatJson = (value: string) => {
            try {
                return JSON.stringify(JSON.parse(value || '{}'), null, 2);
            } catch {
                return value;
            }
        };

        const loadMcpFile = async () => {
            const electronAPI = window.electronAPI;
            if (!electronAPI?.userConfig?.getMcpFile) {
                mcpError.value = 'Electron API 未加载';
                return;
            }
            isLoadingMcp.value = true;
            mcpError.value = '';
            try {
                const result = await electronAPI.userConfig.getMcpFile();
                mcpPath.value = result?.path || '';
                mcpContent.value = formatJson(result?.content || '');
                emitSystemEvent({ title: '.mcp.json 已加载', content: mcpPath.value || '已读取配置', level: 'info' });
            } catch (error: any) {
                const message = error.message || '读取 .mcp.json 失败';
                mcpError.value = message;
                emitSystemEvent({ title: '读取 .mcp.json 失败', content: message, level: 'error' });
            } finally {
                isLoadingMcp.value = false;
            }
        };

        const saveMcpFile = async () => {
            const electronAPI = window.electronAPI;
            if (!electronAPI?.userConfig?.saveMcpFile) {
                mcpError.value = 'Electron API 未加载';
                return;
            }
            isSavingMcp.value = true;
            mcpError.value = '';
            try {
                const result = await electronAPI.userConfig.saveMcpFile(mcpContent.value);
                mcpPath.value = result?.path || mcpPath.value;
                mcpContent.value = formatJson(result?.content || mcpContent.value);
                emitSystemEvent({ title: '.mcp.json 已保存', content: `文件路径：${mcpPath.value}`, level: 'success' });
            } catch (error: any) {
                const message = error.message || '保存 .mcp.json 失败';
                mcpError.value = message;
                emitSystemEvent({ title: '保存 .mcp.json 失败', content: message, level: 'error' });
            } finally {
                isSavingMcp.value = false;
            }
        };

        const updateSubAgentContent = (name: string) => {
            if (name && subAgents.value[name]) {
                subAgentContent.value = subAgents.value[name];
            } else if (!newSubAgentName.value.trim()) {
                subAgentContent.value = '';
            }
        };

        const loadSubAgents = async (preferred?: string) => {
            const electronAPI = window.electronAPI;
            if (!electronAPI?.claudeAgent?.getSubAgents) {
                subAgentError.value = 'Electron API 未加载';
                return;
            }
            isLoadingSubAgents.value = true;
            subAgentError.value = '';
            try {
                const result = (await electronAPI.claudeAgent.getSubAgents()) || {};
                subAgents.value = result;
                const names = Object.keys(result);
                const nextName = preferred && result[preferred] ? preferred : names[0] || '';
                selectedSubAgent.value = nextName;
                subAgentContent.value = nextName ? (result[nextName] ?? '') : '';
                emitSystemEvent({ title: '子代理已加载', content: `共 ${names.length} 个子代理`, level: 'info' });
            } catch (error: any) {
                const message = error.message || '获取子代理失败';
                subAgentError.value = message;
                emitSystemEvent({ title: '获取子代理失败', content: message, level: 'error' });
            } finally {
                isLoadingSubAgents.value = false;
            }
        };

        const saveSubAgent = async () => {
            const electronAPI = window.electronAPI;
            if (!electronAPI?.claudeAgent?.setSubAgents) {
                subAgentError.value = 'Electron API 未加载';
                return;
            }
            const targetName = (newSubAgentName.value || selectedSubAgent.value).trim();
            if (!targetName) {
                subAgentError.value = '请先选择或输入子代理名称';
                return;
            }
            isSavingSubAgent.value = true;
            subAgentError.value = '';
            try {
                await electronAPI.claudeAgent.setSubAgents(targetName, { prompt: subAgentContent.value });
                emitSystemEvent({ title: '子代理已保存', content: `${targetName} 已更新`, level: 'success' });
                newSubAgentName.value = '';
                await loadSubAgents(targetName);
            } catch (error: any) {
                const message = error.message || '保存子代理失败';
                subAgentError.value = message;
                emitSystemEvent({ title: '保存子代理失败', content: message, level: 'error' });
            } finally {
                isSavingSubAgent.value = false;
            }
        };

        const updateCommandContent = (name: string) => {
            if (name && commands.value[name]) {
                commandContent.value = commands.value[name];
            } else if (!newCommandName.value.trim()) {
                commandContent.value = '';
            }
        };

        const loadCommands = async (preferred?: string) => {
            const electronAPI = window.electronAPI;
            if (!electronAPI?.claudeAgent?.getCommands) {
                commandError.value = 'Electron API 未加载';
                return;
            }
            isLoadingCommands.value = true;
            commandError.value = '';
            try {
                const result = (await electronAPI.claudeAgent.getCommands()) || {};
                commands.value = result;
                const names = Object.keys(result);
                const nextName = preferred && result[preferred] ? preferred : names[0] || '';
                selectedCommand.value = nextName;
                commandContent.value = nextName ? (result[nextName] ?? '') : '';
                emitSystemEvent({ title: '命令已加载', content: `共 ${names.length} 条命令`, level: 'info' });
            } catch (error: any) {
                const message = error.message || '获取命令失败';
                commandError.value = message;
                emitSystemEvent({ title: '获取命令失败', content: message, level: 'error' });
            } finally {
                isLoadingCommands.value = false;
            }
        };

        const saveCommand = async () => {
            const electronAPI = window.electronAPI;
            if (!electronAPI?.claudeAgent?.setCommands) {
                commandError.value = 'Electron API 未加载';
                return;
            }
            const targetName = (newCommandName.value || selectedCommand.value).trim();
            if (!targetName) {
                commandError.value = '请先选择或输入命令名称';
                return;
            }
            isSavingCommand.value = true;
            commandError.value = '';
            try {
                await electronAPI.claudeAgent.setCommands(targetName, commandContent.value);
                emitSystemEvent({ title: '命令已保存', content: `${targetName} 已更新`, level: 'success' });
                newCommandName.value = '';
                await loadCommands(targetName);
            } catch (error: any) {
                const message = error.message || '保存命令失败';
                commandError.value = message;
                emitSystemEvent({ title: '保存命令失败', content: message, level: 'error' });
            } finally {
                isSavingCommand.value = false;
            }
        };

        watch(
            () => props.config,
            (newConfig) => {
                Object.assign(localConfig, newConfig);
            },
            { deep: true },
        );

        watch(selectedSubAgent, (name) => {
            updateSubAgentContent(name);
        });

        watch(selectedCommand, (name) => {
            updateCommandContent(name);
        });

        watch(
            () => props.visible,
            (visible) => {
                if (visible) {
                    void loadMcpFile();
                    void loadSubAgents();
                    void loadCommands();
                }
            },
        );

        const updateField = (key: keyof AgentConfig, value: string) => {
            localConfig[key] = value;
            emit('update:config', { ...localConfig });
        };

        const handleSave = () => {
            emit('save', { ...localConfig });
        };

        const handleInitialize = () => {
            emit('initialize');
        };

        const handleClose = () => {
            emit('close');
        };

        return {
            localConfig,
            updateField,
            handleSave,
            handleInitialize,
            handleClose,
            mcpPath,
            mcpContent,
            mcpError,
            isLoadingMcp,
            isSavingMcp,
            loadMcpFile,
            saveMcpFile,
            subAgentOptions,
            selectedSubAgent,
            newSubAgentName,
            subAgentContent,
            subAgentError,
            isLoadingSubAgents,
            isSavingSubAgent,
            loadSubAgents,
            saveSubAgent,
            commandOptions,
            selectedCommand,
            newCommandName,
            commandContent,
            commandError,
            isLoadingCommands,
            isSavingCommand,
            loadCommands,
            saveCommand,
        };
    },
});
</script>

<style scoped>
.agent-config-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(6px);
    z-index: 50;
    padding: 1.5rem;
}

.agent-config-panel {
    height: 100%;
    overflow-y: auto;
    width: 100%;
    max-width: 480px;
    background: #ffffff;
    border-radius: 1rem;
    box-shadow: 0 20px 50px rgba(30, 64, 175, 0.25);
    padding: 1.5rem;
}

.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.panel-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
}

.panel-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
}

.icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    border: none;
    background: rgba(99, 102, 241, 0.1);
    color: #4c1d95;
    font-size: 1.25rem;
    cursor: pointer;
    transition: background 0.2s;
}

.icon-button:hover {
    background: rgba(99, 102, 241, 0.25);
}

.panel-body {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.875rem;
    color: #4b5563;
}

.input {
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    transition:
        border-color 0.2s,
        box-shadow 0.2s;
}

.input:focus {
    outline: none;
    border-color: transparent;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
}

.panel-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

@media (min-width: 480px) {
    .panel-actions {
        flex-direction: row;
    }
}

.btn {
    flex: 1;
    border: none;
    border-radius: 0.75rem;
    padding: 0.85rem 1rem;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition:
        background 0.2s,
        transform 0.2s;
}

.btn:disabled {
    cursor: not-allowed;
    opacity: 0.8;
}

.btn-primary {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
}

.btn-secondary {
    background: #e5e7eb;
    color: #1f2937;
}

.btn-secondary:hover:not(:disabled) {
    background: #d1d5db;
}

.panel-divider {
    height: 1px;
    width: 100%;
    background: rgba(107, 114, 128, 0.15);
    margin: 1.5rem 0;
}

.panel-section {
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.section-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: #111827;
}

.section-subtitle {
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #9ca3af;
    margin-bottom: 0.2rem;
}

.section-path {
    font-size: 0.8rem;
    color: #6b7280;
}

.text-button {
    border: none;
    background: transparent;
    font-size: 0.9rem;
    color: #2563eb;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
}

.text-button:disabled {
    color: #9ca3af;
    cursor: not-allowed;
}

.code-textarea {
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
    font-size: 0.85rem;
    color: #111827;
    min-height: 140px;
    resize: vertical;
    background: #f9fafb;
}

.code-textarea:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    background: #ffffff;
}

.section-actions {
    display: flex;
    justify-content: flex-end;
}

.section-error {
    font-size: 0.85rem;
    color: #dc2626;
}

.selection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
}

.select {
    appearance: none;
    background: url('data:image/svg+xml;utf8,<svg fill="%236b7280" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.957a.75.75 0 111.08 1.04l-4.25 4.53a.75.75 0 01-1.08 0l-4.25-4.53a.75.75 0 01.02-1.06z"/></svg>') no-repeat right 1rem center;
    background-color: #fff;
    background-size: 1rem;
}

.agent-config-fade-enter-active,
.agent-config-fade-leave-active {
    transition: opacity 0.25s ease;
}

.agent-config-fade-enter-from,
.agent-config-fade-leave-to {
    opacity: 0;
}
</style>
