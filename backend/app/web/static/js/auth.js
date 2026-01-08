class AuthAPI {
    constructor() {
        this.baseURL = '/api/v1';
        this.tokenKey = 'access_token';
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setToken(token) {
        if (token) {
            localStorage.setItem(this.tokenKey, token);
        } else {
            localStorage.removeItem(this.tokenKey);
        }
    }

    clearToken() {
        localStorage.removeItem(this.tokenKey);
    }

    async request(url, options = {}) {
        const headers = options.headers || {};
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (!headers['Content-Type'] && options.body && typeof options.body === 'object') {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        
        try {
            const response = await fetch(fullURL, {
                ...options,
                headers,
                credentials: 'include'
            });

            if (response.status === 401) {
                this.clearToken();
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                }
                throw new Error('未授权，请重新登录');
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || data.message || `请求失败: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API 请求错误:', error);
            throw error;
        }
    }

    async get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    }

    async post(url, data, options = {}) {
        return this.request(url, { 
            ...options, 
            method: 'POST', 
            body: data 
        });
    }

    async put(url, data, options = {}) {
        return this.request(url, { 
            ...options, 
            method: 'PUT', 
            body: data 
        });
    }

    async delete(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' });
    }

    async login(username, password) {
        const response = await this.post('/auth/login', { username, password });
        if (response.success && response.data.token) {
            this.setToken(response.data.token.access_token);
            // 设置登录状态和用户信息到localStorage
            localStorage.setItem('isLoggedIn', 'true');
            if (response.data.user) {
                localStorage.setItem('username', response.data.user.username);
            }
        }
        return response;
    }

    async register(username, password, email) {
        const response = await this.post('/auth/register', { username, password, email });
        if (response.success && response.data.token) {
            this.setToken(response.data.token.access_token);
        }
        return response;
    }

    async logout() {
        try {
            await this.post('/auth/logout');
        } catch (error) {
            console.error('登出请求失败:', error);
        } finally {
            this.clearToken();
            // 清除localStorage中的登录状态和用户信息
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            window.location.href = '/login';
        }
    }

    async getCurrentUser() {
        return this.get('/auth/me');
    }

    isLoggedIn() {
        return !!this.getToken();
    }
}

window.authAPI = new AuthAPI();
