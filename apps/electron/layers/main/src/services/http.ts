/**
 * HTTP 服务
 * 在 Electron 主进程中处理 HTTP 请求，避免跨域问题
 * 使用 Node.js 22+ 内置的 fetch API
 */

interface HttpRequestConfig {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    data?: any;
    timeout?: number;
}

interface HttpResponse {
    data: any;
    status: number;
    statusText: string;
    headers: Record<string, string>;
}

class HttpService {
    /**
     * 发送 HTTP 请求
     */
    async request(config: HttpRequestConfig): Promise<HttpResponse> {
        try {
            const method = config.method || 'GET';
            const headers = config.headers || {};

            // 构建 fetch 选项
            const fetchOptions: RequestInit = {
                method,
                headers,
            };

            // 处理请求体
            if (config.data && method !== 'GET') {
                if (typeof config.data === 'string') {
                    fetchOptions.body = config.data;
                } else {
                    fetchOptions.body = JSON.stringify(config.data);
                    if (!headers['Content-Type']) {
                        headers['Content-Type'] = 'application/json';
                    }
                }
            }

            // 设置超时
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);
            fetchOptions.signal = controller.signal;

            try {
                const response = await fetch(config.url, fetchOptions);
                clearTimeout(timeoutId);

                // 解析响应
                let data: any;
                const contentType = response.headers.get('content-type');

                if (contentType?.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }

                // 构造响应头对象
                const responseHeaders: Record<string, string> = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });

                return {
                    data,
                    status: response.status,
                    statusText: response.statusText,
                    headers: responseHeaders,
                };
            } catch (error: any) {
                clearTimeout(timeoutId);

                if (error.name === 'AbortError') {
                    throw new Error('请求超时');
                }
                throw new Error(`请求失败: ${error.message}`);
            }
        } catch (error: any) {
            throw new Error(`请求配置错误: ${error.message}`);
        }
    }

    /**
     * GET 请求
     */
    async get(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
        return this.request({ url, method: 'GET', headers });
    }

    /**
     * POST 请求
     */
    async post(url: string, data?: any, headers?: Record<string, string>): Promise<HttpResponse> {
        return this.request({ url, method: 'POST', data, headers });
    }

    /**
     * PUT 请求
     */
    async put(url: string, data?: any, headers?: Record<string, string>): Promise<HttpResponse> {
        return this.request({ url, method: 'PUT', data, headers });
    }

    /**
     * DELETE 请求
     */
    async delete(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
        return this.request({ url, method: 'DELETE', headers });
    }

    /**
     * PATCH 请求
     */
    async patch(url: string, data?: any, headers?: Record<string, string>): Promise<HttpResponse> {
        return this.request({ url, method: 'PATCH', data, headers });
    }
}

export const httpService = new HttpService();
