import axios, { AxiosInstance } from 'axios';
import type {
  LoginResponse,
  Account,
  Transaction,
  Category,
  Budget,
  BudgetUsage,
  StatisticsOverview,
  PageParams,
} from '../types';
import { getToken, removeToken } from '../utils/auth';
const BASE_URL = '/api/v1';
class ApiClient {
  private client: AxiosInstance;
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        const token = getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        return response.data;
      },
      (error) => {
        if (error.response?.status === 401) {
          removeToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }
  // 认证
  async login(username: string, password: string): Promise<LoginResponse> {
    return this.client.post('/auth/login', { username, password });
  }
  async register(username: string, password: string, email: string, nickname: string) {
    return this.client.post('/auth/register', { username, password, email, nickname });
  }
  // 账户管理
  async getAccounts(): Promise<Account[]> {
    return this.client.get('/accounts').then((res: any) => res.accounts || []);
  }
  async createAccount(data: Partial<Account>): Promise<Account> {
    return this.client.post('/accounts', data);
  }
  async updateAccount(id: number, data: Partial<Account>): Promise<Account> {
    return this.client.put(`/accounts/${id}`, data);
  }
  async deleteAccount(id: number): Promise<void> {
    return this.client.delete(`/accounts/${id}`);
  }
  // 记账记录
  async getTransactions(params: PageParams & {
    startDate?: string;
    endDate?: string;
    type?: string;
    categoryId?: number;
    accountId?: number;
  }): Promise<any> {
    return this.client.get('/transactions', { params });
  }
  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    return this.client.post('/transactions', data);
  }
  async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
    return this.client.put(`/transactions/${id}`, data);
  }
  async deleteTransaction(id: number): Promise<void> {
    return this.client.delete(`/transactions/${id}`);
  }
  // 分类管理
  async getCategories(): Promise<Category[]> {
    return this.client.get('/categories');
  }
  async createCategory(data: Partial<Category>): Promise<Category> {
    return this.client.post('/categories', data);
  }
  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    return this.client.put(`/categories/${id}`, data);
  }
  async deleteCategory(id: number): Promise<void> {
    return this.client.delete(`/categories/${id}`);
  }
  // 预算管理
  async getBudgets(): Promise<Budget[]> {
    return this.client.get('/budgets');
  }
  // 预算使用情况
  async getBudgetUsage(): Promise<BudgetUsage[]> {
    return this.client.get('/budgets/usage');
  }
  async createBudget(data: Partial<Budget>): Promise<Budget> {
    return this.client.post('/budgets', data);
  }
  async updateBudget(id: number, data: Partial<Budget>): Promise<Budget> {
    return this.client.put(`/budgets/${id}`, data);
  }
  async deleteBudget(id: number): Promise<void> {
    return this.client.delete(`/budgets/${id}`);
  }
  // 统计分析
  async getStatistics(params: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StatisticsOverview> {
    return this.client.get('/statistics/overview', { params });
  }
  // 活动管理（骑行）
  async getActivities(params?: PageParams): Promise<any> {
    return this.client.get('/activities', { params });
  }
  async getActivityDetail(id: number): Promise<any> {
    return this.client.get(`/activities/${id}`);
  }
  async createActivity(data: any): Promise<any> {
    return this.client.post('/activities', data);
  }
  async updateActivity(id: number, data: any): Promise<any> {
    return this.client.put(`/activities/${id}`, data);
  }
  async deleteActivity(id: number): Promise<void> {
    return this.client.delete(`/activities/${id}`);
  }
  // 健康管理
  async getHealthProfile(): Promise<any> {
    return this.client.get('/health/profile');
  }
  async createHealthProfile(data: any): Promise<any> {
    return this.client.post('/health/profile', data);
  }
  async updateHealthProfile(data: any): Promise<any> {
    return this.client.put('/health/profile', data);
  }
  async deleteHealthProfile(): Promise<void> {
    return this.client.delete('/health/profile');
  }
  async getHealthHistory(): Promise<any> {
    return this.client.get('/health/history');
  }
  // 用户管理
  async getUserProfile(): Promise<any> {
    return this.client.get('/user/profile');
  }
  async updateUserProfile(data: any): Promise<any> {
    return this.client.put('/user/profile', data);
  }
  async resetUserData(): Promise<any> {
    return this.client.post('/users/reset-data');
  }

  // ==================== 股票分析 ====================

  // 获取自选股列表
  async getStocks(): Promise<any[]> {
    return this.client.get('/stocks').then((res: any) => res.data || []);
  }

  // 添加自选股
  async addStock(code: string, name?: string): Promise<any> {
    return this.client.post('/stocks', { code, name });
  }

  // 删除自选股
  async deleteStock(id: number): Promise<void> {
    return this.client.delete(`/stocks/${id}`);
  }

  // 综合分析股票（通过 Spring Boot 调用 Python 微服务）
  async analyzeStock(code: string, startDate?: string, endDate?: string, includeAi: boolean = true): Promise<any> {
    return this.client.post(`/stocks/${code}/analyze?includeAi=${includeAi}`, {
      startDate,
      endDate
    }).then((res: any) => res.data);
  }

  // 获取股票信息
  async getStockInfo(code: string): Promise<any> {
    return this.client.get(`/stocks/${code}/info`).then((res: any) => res.data);
  }

  // 获取技术分析
  async getTechnicalAnalysis(code: string, days: number = 30): Promise<any> {
    return this.client.get(`/stocks/${code}/technical`, { params: { days } }).then((res: any) => res.data);
  }

  // 获取基本面分析
  async getFundamentalAnalysis(code: string): Promise<any> {
    return this.client.get(`/stocks/${code}/fundamental`).then((res: any) => res.data);
  }

  // 生成AI报告
  async generateAIReport(code: string, startDate?: string): Promise<any> {
    return this.client.post(`/stocks/${code}/ai-report`, {
      start_date: startDate,
    }).then((res: any) => res.data);
  }

  // AI 智能对话（SSE 流式）
  chatWithAI(
    message: string,
    onMessage: (chunk: string) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): () => void {
    const token = localStorage.getItem('token');

    // 使用 fetch 发送 POST 请求启动流式对话
    fetch(`${BASE_URL}/llm/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    }).then(async (response) => {
      if (!response.ok) {
        onError(`请求失败: ${response.status}`);
        return;
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        onError('无法读取响应流');
        return;
      }
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') {
                onComplete();
                return;
              }
              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  onMessage(parsed.content || data);
                } catch {
                  onMessage(data);
                }
              }
            }
          }
        }
        onComplete();
      } catch (e) {
        onError(`读取失败: ${e}`);
      }
    }).catch((e) => {
      onError(`请求失败: ${e}`);
    });

    // 返回清理函数（fetch方式不需要关闭连接，返回空函数）
    return () => {
      // fetch API 不需要手动关闭连接
    };
  }

  // AI 分析（SSE 流式）
  analyzeSpendingStream(
    transactions: any[],
    budgetInfo: any,
    onMessage: (chunk: string) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): () => void {
    const token = localStorage.getItem('token');
    const requestData = JSON.stringify({ transactions, budgetInfo });
    // 使用 fetch 发送 POST 请求启动流式分析
    fetch(`${BASE_URL}/llm/spending/analyze-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: requestData,
    }).then(async (response) => {
      if (!response.ok) {
        onError(`请求失败: ${response.status}`);
        return;
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        onError('无法读取响应流');
        return;
      }
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') {
                onComplete();
                return;
              }
              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  onMessage(parsed.content || data);
                } catch {
                  onMessage(data);
                }
              }
            }
          }
        }
        onComplete();
      } catch (e) {
        onError(`读取失败: ${e}`);
      }
    }).catch((e) => {
      onError(`请求失败: ${e}`);
    });
    // 返回清理函数（fetch方式不需要关闭连接）
    return () => {
      // fetch API 不需要手动关闭连接
    };
  }

  // 股票实时分析（SSE 流式）
  analyzeStockRealtime(
    code: string,
    onEvent: (event: string, data: any) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): () => void {
    const token = getToken(); // 使用 getToken() 确保使用正确的 key

    fetch(`${BASE_URL}/stocks/${code}/realtime`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
    }).then(async (response) => {
      if (!response.ok) {
        onError(`请求失败: ${response.status}`);
        return;
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        onError('无法读取响应流');
        return;
      }
      let currentEvent = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            // 解析 SSE 事件格式
            if (line.startsWith('event:')) {
              currentEvent = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              const data = line.substring(5).trim();
              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  onEvent(currentEvent || 'message', parsed);
                } catch {
                  onEvent(currentEvent || 'message', data);
                }
              }
              currentEvent = '';
            }
          }
        }
        onComplete();
      } catch (e) {
        onError(`读取失败: ${e}`);
      }
    }).catch((e) => {
      onError(`请求失败: ${e}`);
    });

    // 返回清理函数
    return () => {
      // fetch API 不需要手动关闭连接
    };
  }
}
export const api = new ApiClient();
