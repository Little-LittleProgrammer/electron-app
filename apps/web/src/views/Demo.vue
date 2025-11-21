<template>
    <div class="demo-page">
        <div class="sidebar">
            <h2>功能演示</h2>
            <nav>
                <a v-for="item in menuItems" :key="item.id" :class="['menu-item', { active: activeMenu === item.id }]" @click="activeMenu = item.id">
                    <span class="menu-icon">{{ item.icon }}</span>
                    <span class="menu-text">{{ item.text }}</span>
                </a>
            </nav>
        </div>

        <div class="main-content">
            <div class="header">
                <h1>{{ currentMenuItem?.text }}</h1>
                <button @click="goBack" class="btn-back">← 返回首页</button>
            </div>

            <div class="content-area">
                <!-- HTTP 请求演示 -->
                <div v-if="activeMenu === 'http'" class="demo-section">
                    <div class="demo-card">
                        <h3>HTTP 请求测试</h3>
                        <p>通过 IPC 调用 Node.js 进行请求转发（Electron 环境）或直接使用 fetch（浏览器环境）</p>

                        <div class="form-group">
                            <label>请求 URL:</label>
                            <input v-model="httpUrl" type="text" placeholder="https://api.github.com/users/github" class="input" />
                        </div>

                        <div class="form-group">
                            <label>请求方法:</label>
                            <select v-model="httpMethod" class="select">
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                        </div>

                        <div v-if="httpMethod !== 'GET'" class="form-group">
                            <label>请求体 (JSON):</label>
                            <textarea v-model="httpBody" class="textarea" rows="5" placeholder='{"key": "value"}'></textarea>
                        </div>

                        <button @click="sendHttpRequest" :disabled="loading" class="btn btn-primary">
                            {{ loading ? '请求中...' : '发送请求' }}
                        </button>

                        <div v-if="httpResponse" class="response-box">
                            <h4>响应结果:</h4>
                            <div class="response-meta">
                                <span class="badge" :class="getStatusClass(httpResponse.status)"> {{ httpResponse.status }} {{ httpResponse.statusText }} </span>
                            </div>
                            <pre class="response-data">{{ JSON.stringify(httpResponse.data, null, 2) }}</pre>
                        </div>

                        <div v-if="httpError" class="error-box">
                            <h4>❌ 错误:</h4>
                            <p>{{ httpError }}</p>
                        </div>
                    </div>
                </div>

                <!-- 系统信息演示 -->
                <div v-if="activeMenu === 'system'" class="demo-section">
                    <div class="demo-card">
                        <h3>系统信息</h3>
                        <p>查看当前运行环境和系统信息</p>

                        <button @click="loadSystemInfo" :disabled="loading" class="btn btn-primary">
                            {{ loading ? '加载中...' : '获取系统信息' }}
                        </button>

                        <div v-if="systemInfo" class="info-grid">
                            <div class="info-item">
                                <div class="info-label">运行环境:</div>
                                <div class="info-value">{{ systemInfo.environment }}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">用户代理:</div>
                                <div class="info-value">{{ systemInfo.userAgent }}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">平台:</div>
                                <div class="info-value">{{ systemInfo.platform }}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">语言:</div>
                                <div class="info-value">{{ systemInfo.language }}</div>
                            </div>
                            <div v-if="systemInfo.electron" class="info-item full-width">
                                <div class="info-label">Electron 版本:</div>
                                <div class="info-value">Chrome: {{ systemInfo.electron.chrome }}, Node: {{ systemInfo.electron.node }}, Electron: {{ systemInfo.electron.electron }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 文件操作演示 (仅 Electron) -->
                <div v-if="activeMenu === 'file'" class="demo-section">
                    <div class="demo-card">
                        <h3>文件操作</h3>
                        <p v-if="!isElectron" class="warning">⚠️ 此功能仅在 Electron 环境下可用，点击 <a href="/download">下载客户端</a></p>
                        <p v-else>读取和写入本地文件</p>

                        <div v-if="isElectron" class="file-operations">
                            <button @click="selectAndReadFile" class="btn btn-primary">📂 选择并读取文件</button>

                            <button @click="writeTestFile" class="btn btn-secondary">💾 写入测试文件</button>

                            <div v-if="fileContent" class="file-content-box">
                                <h4>文件内容:</h4>
                                <pre>{{ fileContent }}</pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 通知演示 -->
                <div v-if="activeMenu === 'notification'" class="demo-section">
                    <div class="demo-card">
                        <h3>系统通知</h3>
                        <p>发送系统通知（需要权限）</p>

                        <div class="form-group">
                            <label>通知标题:</label>
                            <input v-model="notificationTitle" type="text" placeholder="通知标题" class="input" />
                        </div>

                        <div class="form-group">
                            <label>通知内容:</label>
                            <textarea v-model="notificationBody" class="textarea" rows="3" placeholder="通知内容"></textarea>
                        </div>

                        <button @click="sendNotification" class="btn btn-primary">📢 发送通知</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '../utils/http';
import { getEnvironment, getElectronAPI, isElectron as checkIsElectron } from '../utils/env';

const router = useRouter();
const isElectron = computed(() => checkIsElectron());

// 菜单项
const menuItems = [
    { id: 'http', icon: '🌐', text: 'HTTP 请求' },
    { id: 'system', icon: '💻', text: '系统信息' },
    { id: 'file', icon: '📁', text: '文件操作' },
    { id: 'notification', icon: '📢', text: '系统通知' },
];

const activeMenu = ref('http');
const currentMenuItem = computed(() => menuItems.find((item) => item.id === activeMenu.value));

// HTTP 请求相关
const httpUrl = ref('https://api.github.com/users/github');
const httpMethod = ref<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
const httpBody = ref('{\n  "key": "value"\n}');
const httpResponse = ref<any>(null);
const httpError = ref('');
const loading = ref(false);

// 系统信息
const systemInfo = ref<any>(null);

// 文件内容
const fileContent = ref('');

// 通知
const notificationTitle = ref('测试通知');
const notificationBody = ref('这是一条测试通知消息');

const goBack = () => {
    router.push('/');
};

const sendHttpRequest = async () => {
    loading.value = true;
    httpResponse.value = null;
    httpError.value = '';

    try {
        let data: any = null;
        if (httpMethod.value !== 'GET' && httpBody.value.trim()) {
            try {
                data = JSON.parse(httpBody.value);
            } catch (e) {
                throw new Error('请求体必须是有效的 JSON 格式');
            }
        }

        const response = await http.request({
            url: httpUrl.value,
            method: httpMethod.value,
            data,
        });

        httpResponse.value = response;
    } catch (error: any) {
        httpError.value = error.message || '请求失败';
    } finally {
        loading.value = false;
    }
};

const getStatusClass = (status: number) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'error';
    return '';
};

const loadSystemInfo = async () => {
    loading.value = true;

    try {
        const info: any = {
            environment: getEnvironment() === 'electron' ? 'Electron 应用' : '浏览器',
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
        };

        if (checkIsElectron()) {
            const electronAPI = getElectronAPI();
            if (electronAPI?.system) {
                const versions = await electronAPI.system.getVersions();
                info.electron = versions;
            }
        }

        systemInfo.value = info;
    } catch (error) {
        console.error('获取系统信息失败:', error);
    } finally {
        loading.value = false;
    }
};

const selectAndReadFile = async () => {
    if (!checkIsElectron()) return;

    try {
        const electronAPI = getElectronAPI();
        if (!electronAPI?.file) {
            throw new Error('文件 API 不可用');
        }

        const content = await electronAPI.file.selectAndRead();
        if (content) {
            fileContent.value = content;
        }
    } catch (error: any) {
        alert(`读取文件失败: ${error.message}`);
    }
};

const writeTestFile = async () => {
    if (!checkIsElectron()) return;

    try {
        const electronAPI = getElectronAPI();
        if (!electronAPI?.file) {
            throw new Error('文件 API 不可用');
        }

        const testContent = `测试文件
创建时间: ${new Date().toLocaleString()}
内容: 这是一个测试文件
`;

        const success = await electronAPI.file.write(testContent);
        if (success) {
            alert('文件写入成功！');
        }
    } catch (error: any) {
        alert(`写入文件失败: ${error.message}`);
    }
};

const sendNotification = () => {
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            new Notification(notificationTitle.value, {
                body: notificationBody.value,
                icon: '/favicon.ico',
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    new Notification(notificationTitle.value, {
                        body: notificationBody.value,
                        icon: '/favicon.ico',
                    });
                }
            });
        } else {
            alert('通知权限被拒绝，请在浏览器设置中启用通知权限');
        }
    } else {
        alert('当前浏览器不支持通知功能');
    }
};
</script>

<style scoped>
.demo-page {
    width: 100%;
    height: 100%;
    display: flex;
    background: #f5f7fa;
}

.sidebar {
    width: 260px;
    background: #2c3e50;
    color: white;
    padding: 30px 0;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.sidebar h2 {
    padding: 0 30px;
    margin-bottom: 30px;
    font-size: 24px;
}

.menu-item {
    display: flex;
    align-items: center;
    padding: 15px 30px;
    cursor: pointer;
    transition: all 0.3s;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
}

.menu-item:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
}

.menu-item.active {
    background: #3498db;
    color: white;
    border-left: 4px solid white;
}

.menu-icon {
    font-size: 20px;
    margin-right: 12px;
}

.menu-text {
    font-size: 16px;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.header {
    background: white;
    padding: 30px 40px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header h1 {
    font-size: 28px;
    color: #2c3e50;
    margin: 0;
}

.btn-back {
    padding: 10px 20px;
    background: #ecf0f1;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    color: #2c3e50;
    transition: all 0.3s;
}

.btn-back:hover {
    background: #bdc3c7;
}

.content-area {
    flex: 1;
    overflow-y: auto;
    padding: 40px;
}

.demo-section {
    max-width: 900px;
    margin: 0 auto;
}

.demo-card {
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.demo-card h3 {
    font-size: 22px;
    color: #2c3e50;
    margin-bottom: 10px;
}

.demo-card > p {
    color: #7f8c8d;
    margin-bottom: 25px;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    color: #2c3e50;
    font-weight: 500;
}

.input,
.select,
.textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #dfe6e9;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    transition: border-color 0.3s;
}

.input:focus,
.select:focus,
.textarea:focus {
    outline: none;
    border-color: #3498db;
}

.textarea {
    resize: vertical;
    font-family: 'Courier New', monospace;
}

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s;
    margin-right: 10px;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-primary {
    background: #3498db;
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: #2980b9;
    transform: translateY(-1px);
}

.btn-secondary {
    background: #95a5a6;
    color: white;
}

.btn-secondary:hover:not(:disabled) {
    background: #7f8c8d;
}

.response-box,
.error-box {
    margin-top: 25px;
    padding: 20px;
    border-radius: 8px;
}

.response-box {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
}

.response-box h4,
.error-box h4 {
    margin-bottom: 15px;
    color: #2c3e50;
}

.response-meta {
    margin-bottom: 15px;
}

.badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
}

.badge.success {
    background: #d4edda;
    color: #155724;
}

.badge.warning {
    background: #fff3cd;
    color: #856404;
}

.badge.error {
    background: #f8d7da;
    color: #721c24;
}

.response-data {
    background: #2c3e50;
    color: #ecf0f1;
    padding: 15px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.5;
    margin: 0;
}

.error-box {
    background: #fff5f5;
    border: 1px solid #fc8181;
}

.error-box p {
    color: #c53030;
    margin: 0;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 25px;
}

.info-item {
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
}

.info-item.full-width {
    grid-column: 1 / -1;
}

.info-label {
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 5px;
    font-size: 14px;
}

.info-value {
    color: #7f8c8d;
    font-size: 14px;
    word-break: break-all;
}

.warning {
    background: #fff3cd;
    color: #856404;
    padding: 15px;
    border-radius: 6px;
    border: 1px solid #ffeaa7;
}

.file-operations {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.file-operations button {
    align-self: flex-start;
}

.file-content-box {
    margin-top: 20px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
}

.file-content-box h4 {
    margin-bottom: 15px;
    color: #2c3e50;
}

.file-content-box pre {
    background: #2c3e50;
    color: #ecf0f1;
    padding: 15px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.5;
    margin: 0;
    max-height: 400px;
    overflow-y: auto;
}
</style>
