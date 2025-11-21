import { getElectronAPI, isElectron } from './env';

/**
 * HTTP 请求配置
 */
export interface HttpRequestConfig {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    data?: any;
    params?: Record<string, any>;
    timeout?: number;
}

/**
 * HTTP 响应
 */
export interface HttpResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
}

/**
 * HTTP 请求类
 * 在 Electron 环境中通过 IPC 调用 Node.js 进行请求
 * 在浏览器环境中使用 fetch API
 */
class HttpClient {
    private baseURL: string = '';
    private defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    /**
     * 设置基础 URL
     */
    setBaseURL(url: string) {
        this.baseURL = url;
    }

    /**
     * 设置默认请求头
     */
    setDefaultHeaders(headers: Record<string, string>) {
        this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    }

    /**
     * 发送请求
     */
    async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
        const url = this.buildURL(config.url, config.params);
        const method = config.method || 'GET';
        const headers = { ...this.defaultHeaders, ...config.headers };

        // 在 Electron 环境中使用 IPC 调用
        if (isElectron()) {
            const electronAPI = getElectronAPI();
            if (!electronAPI) {
                throw new Error('无法获取 Electron API');
            }

            try {
                const response = await electronAPI.http.request({
                    url,
                    method,
                    headers,
                    data: config.data,
                    timeout: config.timeout,
                });

                return response;
            } catch (error) {
                throw new Error(`HTTP 请求失败: ${error}`);
            }
        }

        // 在浏览器环境中使用 fetch
        try {
            const fetchOptions: RequestInit = {
                method,
                headers,
            };

            if (config.data && method !== 'GET') {
                fetchOptions.body = JSON.stringify(config.data);
            }

            const response = await fetch(url, fetchOptions);
            const data = await response.json();

            return {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: this.parseHeaders(response.headers),
            };
        } catch (error) {
            throw new Error(`HTTP 请求失败: ${error}`);
        }
    }

    /**
     * GET 请求
     */
    get<T = any>(url: string, params?: Record<string, any>, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'params'>): Promise<HttpResponse<T>> {
        return this.request<T>({ ...config, url, method: 'GET', params });
    }

    /**
     * POST 请求
     */
    post<T = any>(url: string, data?: any, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
        return this.request<T>({ ...config, url, method: 'POST', data });
    }

    /**
     * PUT 请求
     */
    put<T = any>(url: string, data?: any, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
        return this.request<T>({ ...config, url, method: 'PUT', data });
    }

    /**
     * DELETE 请求
     */
    delete<T = any>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<HttpResponse<T>> {
        return this.request<T>({ ...config, url, method: 'DELETE' });
    }

    /**
     * PATCH 请求
     */
    patch<T = any>(url: string, data?: any, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
        return this.request<T>({ ...config, url, method: 'PATCH', data });
    }

    /**
     * 构建完整 URL
     */
    private buildURL(url: string, params?: Record<string, any>): string {
        let fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;

        if (params) {
            const queryString = Object.entries(params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');

            fullURL += (fullURL.includes('?') ? '&' : '?') + queryString;
        }

        return fullURL;
    }

    /**
     * 解析响应头
     */
    private parseHeaders(headers: Headers): Record<string, string> {
        const result: Record<string, string> = {};
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }
}

// 导出单例
export const http = new HttpClient();
