import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router';
import { isElectron } from '@electron-app/shared';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../views/Home.vue'),
    },
    {
        path: '/download',
        name: 'Download',
        component: () => import('../views/Download.vue'),
    },
    {
        path: '/demo',
        name: 'Demo',
        component: () => import('../views/Demo.vue'),
    },
];

// Electron 环境使用 hash 模式，浏览器环境使用 history 模式
const router = createRouter({
    history: isElectron() ? createWebHashHistory() : createWebHistory(),
    routes,
});

// 路由守卫：浏览器环境下拦截非下载页面的访问
// router.beforeEach((to, from, next) => {
//     // 如果是浏览器环境，且访问的不是下载页面，则跳转到下载页面
//     if (!isElectron() && to.path !== '/download') {
//         next('/download');
//     } else {
//         next();
//     }
// });

export default router;
