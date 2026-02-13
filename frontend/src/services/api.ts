import axios, { AxiosInstance } from 'axios';
import type {
  LoginResponse,
  Account,
  Transaction,
  Category,
  Budget,
  BudgetHierarchyDto,
  BudgetUsage,
  StatisticsOverview,
  PageParams,
  Currency,
  FundAccountGroup,
  MultiCurrencyAccountsResponse,
  CreateFundAccountGroupRequest,
  AddCurrencyRequest,
  AccountHistoryResponse,
  RecentActivity,
  AnomalyResponse,
  HealthScoreResponse,
  ComparisonResponse,
  PredictionResponse,
  ExchangeRate,
  CurrentExchangeRate,
  Activity,
  ActivityRequest,
  HealthProfile,
  HealthProfileRequest,
  UserProfile,
  UpdateUserProfileRequest,
  Stock,
  StockInfo,
  StockAnalysisResponse,
  TechnicalAnalysis,
  FundamentalAnalysis,
} from '../types';
import { getToken, getRefreshToken, setToken, setRefreshToken, clearAuthTokens } from '../utils/auth';

const BASE_URL = '/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

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
        // 对 /transactions 端点特殊处理，返回分页格式
        if (response.config.url?.includes('/transactions')) {
          const totalCount = response.headers['x-total-count'];
          return {
            content: Array.isArray(response.data) ? response.data : [],
            totalElements: totalCount ? parseInt(totalCount) : (Array.isArray(response.data) ? response.data.length : 0)
          };
        }

        // 检查业务逻辑错误（success: false），排除 /auth 路径
        if (response.data && typeof response.data === 'object' && 'success' in response.data && !response.config.url?.includes('/auth')) {
          if (!response.data.success) {
            // 抛出业务错误，让 mutation 的 onError 捕获
            const error = new Error(response.data.message || '操作失败');
            (error as any).response = response;
            return Promise.reject(error);
          }
        }

        return response.data;
      },
      async (error) => {
        const originalRequest = error.config;

        // 如果是 401 错误且不是登录/刷新接口
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth')) {
          if (this.isRefreshing) {
            // 如果正在刷新，将请求加入队列
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.client(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            // 尝试刷新 token
            const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
            const { token, refreshToken: newRefreshToken } = response.data;

            // 更新 token
            setToken(token);
            if (newRefreshToken) {
              setRefreshToken(newRefreshToken);
            }

            // 处理队列中的请求
            this.failedQueue.forEach((prom) => prom.resolve());
            this.failedQueue = [];

            // 重试原请求
            return this.client(originalRequest);
          } catch (refreshError) {
            // 刷新失败，清除 token 并跳转登录
            this.failedQueue.forEach((prom) => prom.reject(refreshError));
            this.failedQueue = [];
            clearAuthTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
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
  // 资金账户管理
  async getAccounts(): Promise<Account[]> {
    return this.client.get('/fund-accounts').then(res => {
      const data = res as unknown as { accounts: Account[] };
      return data.accounts || [];
    });
  }
  async createAccount(data: Partial<Account>): Promise<Account> {
    return this.client.post('/fund-accounts', data);
  }
  async updateAccount(id: number, data: Partial<Account>): Promise<Account> {
    return this.client.put(`/fund-accounts/${id}`, data);
  }
  async deleteAccount(id: number): Promise<void> {
    return this.client.delete(`/fund-accounts/${id}`);
  }

  // 更新账户余额（余额校准）
  async updateAccountBalance(accountId: number, currency: string, balance: number, reason?: string): Promise<void> {
    return this.client.put(`/fund-accounts/${accountId}/balance`, { currency, balance, reason });
  }

  /**
   * 获取账户历史记录
   *
   * @param accountId 账户ID
   * @param params 查询参数
   * @returns 账户历史响应（分页）
   */
  async getAccountHistory(
    accountId: number,
    params: {
      currency?: string;
      page?: number;
      size?: number;
    } = {}
  ): Promise<AccountHistoryResponse> {
    const queryParams = new URLSearchParams();
    if (params.currency) queryParams.append('currency', params.currency);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());

    return this.client.get(
      `/fund-accounts/${accountId}/history?${queryParams.toString()}`
    );
  }

  // ==================== 多货币账户管理 ====================

  // 获取多货币账户列表（支持按货币筛选）
  async getMultiCurrencyAccounts(currency?: Currency): Promise<MultiCurrencyAccountsResponse> {
    const params = currency ? { currency } : {};
    return this.client.get('/multi-currency-accounts', { params });
  }

  // 获取金融账户组详情
  async getAccountGroupDetail(id: number): Promise<FundAccountGroup> {
    return this.client.get(`/multi-currency-accounts/account-groups/${id}`);
  }

  // 创建多货币金融账户组
  async createAccountGroup(data: CreateFundAccountGroupRequest): Promise<FundAccountGroup> {
    return this.client.post('/multi-currency-accounts/account-groups', data);
  }

  // 为金融账户组添加新货币
  async addCurrencyToAccount(accountId: number, data: AddCurrencyRequest): Promise<FundAccountGroup> {
    return this.client.post(`/multi-currency-accounts/account-groups/${accountId}/currencies`, data);
  }

  // ==================== 旧版账户管理（兼容） ====================

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
  async getCategories(params?: { type?: string; parentId?: number }): Promise<Category[]> {
    return this.client.get('/categories', { params });
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
  // 检查分类版本更新
  async checkCategoryVersion(): Promise<{
    configVersion: string;
    dbVersion: string;
    hasUpdate: boolean;
  }> {
    return this.client.get('/categories/check-version');
  }
  // 同步系统分类
  async syncSystemCategories(): Promise<{ synced: boolean; message: string }> {
    return this.client.post('/categories/sync-system');
  }
  // 预算管理
  async getBudgets(): Promise<Budget[]> {
    return this.client.get('/budgets');
  }
  // 预算使用情况
  async getBudgetUsage(period?: string): Promise<BudgetUsage[]> {
    const params = period ? { period } : {};
    return this.client.get('/budgets/usage', { params });
  }
  // 预算层级详情
  async getBudgetHierarchy(params: {
    date: string;
    period: 'day' | 'week' | 'month' | 'year';
  }): Promise<BudgetHierarchyDto> {
    return this.client.get('/budgets/hierarchy', { params });
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

  // 异常消费检测
  async getAnomalies(threshold: number = 3): Promise<AnomalyResponse[]> {
    return this.client.get('/statistics/anomalies', {
      params: { threshold }
    });
  }

  // 财务健康评分
  async getHealthScore(): Promise<HealthScoreResponse> {
    return this.client.get('/statistics/health-score');
  }

  // 同比环比分析
  async getComparison(): Promise<ComparisonResponse> {
    return this.client.get('/statistics/comparison');
  }

  // 预测性分析
  async getPrediction(): Promise<PredictionResponse> {
    return this.client.get('/statistics/prediction');
  }

  // 活动管理（骑行）
  async getActivities(params?: PageParams): Promise<any> {
    return this.client.get('/activities', { params });
  }
  async getActivityDetail(id: number): Promise<any> {
    return this.client.get(`/activities/${id}`);
  }
  async createActivity(data: ActivityRequest): Promise<Activity> {
    return this.client.post('/activities', data);
  }
  async updateActivity(id: number, data: ActivityRequest): Promise<Activity> {
    return this.client.put(`/activities/${id}`, data);
  }
  async deleteActivity(id: number): Promise<void> {
    return this.client.delete(`/activities/${id}`);
  }
  // 健康管理
  async getHealthProfile(): Promise<any> {
    return this.client.get('/health/profile');
  }
  async createHealthProfile(data: HealthProfileRequest): Promise<HealthProfile> {
    return this.client.post('/health/profile', data);
  }
  async updateHealthProfile(data: HealthProfileRequest): Promise<HealthProfile> {
    return this.client.put('/health/profile', data);
  }
  async deleteHealthProfile(): Promise<void> {
    return this.client.delete('/health/profile');
  }
  async getHealthHistory(): Promise<any> {
    return this.client.get('/health/history');
  }
  // 用户管理
  async getUserProfile(): Promise<UserProfile> {
    return this.client.get('/user/profile').then(res => {
      const data = res as unknown as { data: UserProfile };
      return data.data;
    });
  }
  async updateUserProfile(data: UpdateUserProfileRequest): Promise<UserProfile> {
    return this.client.put('/user/profile', data);
  }
  async resetUserData(): Promise<any> {
    return this.client.post('/users/reset-data');
  }

  // 系统健康状态
  async getSystemHealth(): Promise<any> {
    return this.client.get('/system/health');
  }

  // ==================== Dashboard ====================

  /**
   * 获取最近活动
   * @param limit 返回数量限制，范围1-100，默认20
   * @returns 最近的活动列表
   */
  async getRecentActivities(limit: number = 20): Promise<RecentActivity[]> {
    return this.client.get('/dashboard/recent-activities', {
      params: { limit: limit.toString() }
    });
  }

  // ==================== 股票分析 ====================

  // 获取自选股列表
  async getStocks(): Promise<Stock[]> {
    return this.client.get('/stocks').then(res => {
      const data = res as unknown as { data: Stock[] };
      return data.data || [];
    });
  }

  // 添加自选股
  async addStock(code: string, name?: string): Promise<unknown> {
    return this.client.post('/stocks', { code, name });
  }

  // 删除自选股
  async deleteStock(id: number): Promise<void> {
    return this.client.delete(`/stocks/${id}`);
  }

  // 综合分析股票（通过 Spring Boot 调用 Python 微服务）
  async analyzeStock(code: string, startDate?: string, endDate?: string, includeAi: boolean = true): Promise<StockAnalysisResponse> {
    return this.client.post(`/stocks/${code}/analyze?includeAi=${includeAi}`, {
      startDate,
      endDate
    }).then(res => {
      const data = res as unknown as { data: StockAnalysisResponse };
      return data.data;
    });
  }

  // 获取股票信息
  async getStockInfo(code: string): Promise<StockInfo> {
    return this.client.get(`/stocks/${code}/info`).then(res => {
      const data = res as unknown as { data: StockInfo };
      return data.data;
    });
  }

  // 获取技术分析
  async getTechnicalAnalysis(code: string, days: number = 30): Promise<TechnicalAnalysis> {
    return this.client.get(`/stocks/${code}/technical`, { params: { days } }).then(res => {
      const data = res as unknown as { data: TechnicalAnalysis };
      return data.data;
    });
  }

  // 获取基本面分析
  async getFundamentalAnalysis(code: string): Promise<FundamentalAnalysis> {
    return this.client.get(`/stocks/${code}/fundamental`).then(res => {
      const data = res as unknown as { data: FundamentalAnalysis };
      return data.data;
    });
  }

  // 生成AI报告
  async generateAIReport(code: string, startDate?: string): Promise<string> {
    return this.client.post(`/stocks/${code}/ai-report`, {
      start_date: startDate,
    }).then(res => {
      const data = res as unknown as { data: string };
      return data.data;
    });
  }

  // ========== 汇率相关 API ==========

  // 获取当前汇率
  async getCurrentExchangeRate(fromCurrency: string, toCurrency: string = 'CNY'): Promise<CurrentExchangeRate> {
    return this.client.get(`/exchange-rates/current`, {
      params: { from: fromCurrency, to: toCurrency }
    });
  }

  // 获取汇率列表
  async getExchangeRates(params?: {
    from?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ExchangeRate[]> {
    return this.client.get(`/exchange-rates`, { params }).then((res) => res.data);
  }

  // 创建/更新单个汇率
  async saveExchangeRate(data: {
    date: string;
    fromCurrency: string;
    toCurrency: string;
    rate: number;
  }): Promise<ExchangeRate> {
    return this.client.post(`/exchange-rates`, data).then((res) => res.data);
  }

  // 批量创建汇率
  async batchSaveExchangeRates(rates: Array<{
    date: string;
    fromCurrency: string;
    rate: number;
  }>): Promise<{ success: boolean; message: string; count: number }> {
    return this.client.post(`/exchange-rates/batch`, { rates }).then((res) => res.data);
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
    transactions: Array<{ date: string; amount: number; type: string; category_id?: number }>,
    budgetInfo: { period: string; budgets: Budget[] },
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
    onEvent: (event: string, data: unknown) => void,
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
