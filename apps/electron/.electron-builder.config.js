/**
 * Electron Builder 配置
 * @see https://www.electron.build/configuration/configuration
 */

module.exports = {
    appId: 'com.example.electron-vue-vite',
    productName: 'Electron Vue Vite Demo',
    directories: {
        output: 'release/${version}',
        buildResources: 'build',
    },
    files: ['layers/main/dist/**/*', 'layers/preload/dist/**/*', 'package.json'],
    extraResources: [
        {
            from: '../web/dist',
            to: 'renderer/dist',
        },
    ],
    // 确保 asar 打包正常工作
    asar: true,
    asarUnpack: [],
    mac: {
        target: ['dmg', 'zip'],
        category: 'public.app-category.utilities',
        artifactName: '${productName}-${version}-mac-${arch}.${ext}',
    },
    win: {
        target: ['nsis', 'zip'],
        artifactName: '${productName}-${version}-win-${arch}.${ext}',
    },
    linux: {
        target: ['AppImage', 'deb'],
        category: 'Utility',
        artifactName: '${productName}-${version}-linux-${arch}.${ext}',
    },
    nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        perMachine: false,
        deleteAppDataOnUninstall: true,
    },
};
