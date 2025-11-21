<template>
    <div class="download-page">
        <div class="container">
            <div class="icon">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                    <circle cx="60" cy="60" r="60" fill="#667eea" opacity="0.1"  />
                    <path d="M60 30v45m0 0l-15-15m15 15l15-15" stroke="#667eea" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"  />
                    <path d="M35 75v10a5 5 0 005 5h40a5 5 0 005-5V75" stroke="#667eea" stroke-width="6" stroke-linecap="round"  />
                </svg>
            </div>

            <h1>下载桌面应用</h1>
            <p class="subtitle">
                检测到您正在使用浏览器访问，为了获得完整功能体验，<br  />
                请下载我们的桌面应用程序。
            </p>

            <div class="features">
                <div class="feature">
                    <div class="feature-icon">⚡</div>
                    <h3>更快的性能</h3>
                    <p>原生应用体验，更流畅</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔒</div>
                    <h3>更安全</h3>
                    <p>本地数据存储，隐私保护</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🚀</div>
                    <h3>完整功能</h3>
                    <p>解锁所有高级功能</p>
                </div>
            </div>

            <div class="download-buttons">
                <button class="btn btn-primary" @click="downloadForPlatform('windows')">
                    <span class="btn-icon">🪟</span>
                    <div class="btn-text">
                        <div class="btn-title">Windows</div>
                        <div class="btn-subtitle">Win 10 及以上</div>
                    </div>
                </button>

                <button class="btn btn-primary" @click="downloadForPlatform('mac')">
                    <span class="btn-icon">🍎</span>
                    <div class="btn-text">
                        <div class="btn-title">macOS</div>
                        <div class="btn-subtitle">macOS 10.13 及以上</div>
                    </div>
                </button>

                <button class="btn btn-primary" @click="downloadForPlatform('linux')">
                    <span class="btn-icon">🐧</span>
                    <div class="btn-text">
                        <div class="btn-title">Linux</div>
                        <div class="btn-subtitle">Ubuntu/Debian/Fedora</div>
                    </div>
                </button>
            </div>

            <p class="note">
                当前版本: v1.0.0 |
                <a href="#" @click.prevent="viewChangelog">更新日志</a>
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
const downloadForPlatform = (platform: 'windows' | 'mac' | 'linux') => {
    // 这里可以根据平台跳转到对应的下载链接
    console.log(`准备下载 ${platform} 版本`);

    // 示例：跳转到 GitHub Releases
    const downloadUrls = {
        windows: 'https://github.com/your-repo/releases/download/v1.0.0/app-setup-win.exe',
        mac: 'https://github.com/your-repo/releases/download/v1.0.0/app-setup-mac.dmg',
        linux: 'https://github.com/your-repo/releases/download/v1.0.0/app-setup-linux.AppImage',
    };

    // 实际项目中取消注释以下代码
    // window.open(downloadUrls[platform], '_blank')

    alert(`准备下载 ${platform} 版本\n下载链接: ${downloadUrls[platform]}`);
};

const viewChangelog = () => {
    alert('查看更新日志');
    // 实际项目中可以跳转到更新日志页面
};
</script>

<style scoped>
.download-page {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
}

.container {
    text-align: center;
    max-width: 900px;
    background: white;
    border-radius: 24px;
    padding: 60px 40px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.icon {
    margin-bottom: 30px;
    display: flex;
    justify-content: center;
}

h1 {
    font-size: 42px;
    color: #333;
    margin-bottom: 15px;
    font-weight: bold;
}

.subtitle {
    font-size: 16px;
    color: #666;
    margin-bottom: 40px;
    line-height: 1.6;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 30px;
    margin-bottom: 50px;
}

.feature {
    padding: 20px;
}

.feature-icon {
    font-size: 48px;
    margin-bottom: 15px;
}

.feature h3 {
    font-size: 18px;
    color: #333;
    margin-bottom: 8px;
    font-weight: 600;
}

.feature p {
    font-size: 14px;
    color: #666;
    margin: 0;
}

.download-buttons {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 30px;
}

.btn {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px 30px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s;
    font-family: inherit;
    background: #f8f9fa;
    min-width: 200px;
}

.btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.btn-primary:hover {
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.btn-icon {
    font-size: 32px;
}

.btn-text {
    text-align: left;
}

.btn-title {
    font-size: 18px;
    font-weight: 600;
    color: white;
    margin-bottom: 2px;
}

.btn-subtitle {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
}

.note {
    font-size: 14px;
    color: #999;
    margin: 0;
}

.note a {
    color: #667eea;
    text-decoration: none;
}

.note a:hover {
    text-decoration: underline;
}
</style>
