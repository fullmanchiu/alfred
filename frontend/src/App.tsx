import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { Spin, App as AntdApp } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import { getToken } from './utils/auth';
import { queryClient } from './QueryClient';

// 懒加载页面组件
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Home = lazy(() => import('./pages/Home'));
const Finance = lazy(() => import('./pages/Finance'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Accounts = lazy(() => import('./pages/FundAccounts'));
const Categories = lazy(() => import('./pages/Categories'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Cycling = lazy(() => import('./pages/Cycling'));
const Health = lazy(() => import('./pages/Health'));
const HealthSettings = lazy(() => import('./pages/HealthSettings'));
const Profile = lazy(() => import('./pages/Profile'));
const Stocks = lazy(() => import('./pages/Stocks'));
const StockSearch = lazy(() => import('./pages/StockSearch'));
const StockDetail = lazy(() => import('./pages/StockDetail'));
const StockChartPage = lazy(() => import('./pages/StockChartPage'));
const StockDetailTest = lazy(() => import('./pages/StockDetailTest'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Settings = lazy(() => import('./pages/Settings'));
const CommTest = lazy(() => import('./pages/CommTest'));

// 加载中组件
const PageLoading = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: 'var(--color-bg-layout)',
    color: 'var(--color-text-secondary)'
  }}>
    <Spin size="large" />
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
  }, []);

  return (
    <AntdApp>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoading />}>
            <Routes>
            {/* 公开路由 */}
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <Login onLoginSuccess={() => setIsAuthenticated(true)} />
                )
              }
            />
            <Route path="/register" element={<Register />} />
            <Route path="/comm-test" element={<CommTest />} />

            {/* 受保护路由 */}
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Layout onLogout={() => setIsAuthenticated(false)} />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            >
              {/* 首页 */}
              <Route index element={<Home />} />

              {/* 记账模块 */}
              <Route path="finance" element={<Finance />} />
              <Route path="finance/transactions" element={<Transactions />} />
              <Route path="finance/categories" element={<Categories />} />
              <Route path="finance/fund-accounts" element={<Accounts />} />
              <Route path="finance/budgets" element={<Budgets />} />
              <Route path="finance/statistics" element={<Statistics />} />

              {/* 骑行模块 */}
              <Route path="cycling" element={<Cycling />} />

              {/* 健康模块 */}
              <Route path="health" element={<Health />} />
              <Route path="health/settings" element={<HealthSettings />} />

              {/* 股票分析模块 */}
              <Route path="stocks" element={<Stocks />} />
              <Route path="stocks/search" element={<StockSearch />} />
              <Route path="stocks/detail/:code" element={<StockDetail />} />
              <Route path="stocks/chart/:code" element={<StockChartPage />} />
              <Route path="stocks/test/:code" element={<StockDetailTest />} />

              {/* 任务管理模块 */}
              <Route path="tasks" element={<Tasks />} />

              {/* 用户模块 */}
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />

              {/* 兼容旧路由 - Dashboard */}
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="transactions" element={<Navigate to="/finance" replace />} />
              <Route path="records" element={<Navigate to="/finance" replace />} />
              <Route path="categories" element={<Navigate to="/finance/categories" replace />} />
              <Route path="records/categories" element={<Navigate to="/finance/categories" replace />} />
              <Route path="budgets" element={<Navigate to="/finance/budgets" replace />} />
              <Route path="records/budgets" element={<Navigate to="/finance/budgets" replace />} />
              <Route path="statistics" element={<Navigate to="/finance/statistics" replace />} />
              <Route path="records/statistics" element={<Navigate to="/finance/statistics" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      </QueryClientProvider>
    </AntdApp>
  );
}

export default App;
