<template>
    <div class="home-page">
        <div class="header">
            <h1>Electron Vue Vite Demo</h1>
            <p class="env-info">运行环境: {{ environment }}</p>
        </div>

        <div class="content">
            <div class="card">
                <h2>欢迎使用</h2>
                <p>这是一个 Electron + Vue + Vite 的示例应用</p>

                <div class="features">
                    <div class="feature-item">
                        <div class="feature-icon">🚀</div>
                        <div class="feature-text">
                            <h3>环境检测</h3>
                            <p>自动识别浏览器和 Electron 环境</p>
                        </div>
                    </div>

                    <div class="feature-item">
                        <div class="feature-icon">🔗</div>
                        <div class="feature-text">
                            <h3>HTTP 代理</h3>
                            <p>通过 IPC 调用 Node.js 进行请求转发</p>
                        </div>
                    </div>

                    <div class="feature-item">
                        <div class="feature-icon">⚡</div>
                        <div class="feature-text">
                            <h3>独立打包</h3>
                            <p>Web 项目可单独打包部署</p>
                        </div>
                    </div>
                </div>

                <div class="actions">
                    <button v-if="!isElectron" @click="goToDownload" class="btn btn-primary">下载桌面应用</button>
                    <button @click="goToDemo" class="btn btn-primary">进入功能演示</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { getEnvironment } from '../utils/env';
import { isElectron as isElectronUtils } from '../utils/env';

const isElectron = computed(() => isElectronUtils());

const router = useRouter();
const environment = computed(() => {
    return getEnvironment() === 'electron' ? 'Electron 应用' : '浏览器';
});

const goToDemo = () => {
    router.push('/demo');
};

const goToDownload = () => {
    router.push('/download');
};
</script>

<style scoped>
.home-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
    padding: 40px 20px;
    text-align: center;
    color: white;
}

.header h1 {
    font-size: 48px;
    font-weight: bold;
    margin-bottom: 10px;
}

.env-info {
    font-size: 18px;
    opacity: 0.9;
}

.content {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.card {
    background: white;
    border-radius: 20px;
    padding: 40px;
    max-width: 800px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.card h2 {
    font-size: 32px;
    color: #333;
    margin-bottom: 10px;
}

.card > p {
    font-size: 16px;
    color: #666;
    margin-bottom: 30px;
}

.features {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 30px;
}

.feature-item {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 12px;
    transition: transform 0.2s;
}

.feature-item:hover {
    transform: translateX(5px);
}

.feature-icon {
    font-size: 32px;
    min-width: 40px;
}

.feature-text h3 {
    font-size: 18px;
    color: #333;
    margin-bottom: 5px;
}

.feature-text p {
    font-size: 14px;
    color: #666;
    margin: 0;
}

.actions {
    text-align: center;
}

.btn {
    padding: 15px 40px;
    font-size: 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    font-weight: 600;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}
</style>
