import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { Spin } from 'antd';
import Layout from './components/Layout';
import { getToken } from './utils/auth';

// 懒加载页面组件
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Home = lazy(() => import('./pages/Home'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Categories = lazy(() => import('./pages/Categories'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Cycling = lazy(() => import('./pages/Cycling'));
const Health = lazy(() => import('./pages/Health'));
const HealthSettings = lazy(() => import('./pages/HealthSettings'));
const Profile = lazy(() => import('./pages/Profile'));
const Stocks = lazy(() => import('./pages/Stocks'));
const Settings = lazy(() => import('./pages/Settings'));

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
            <Route path="records" element={<Transactions />} />
            <Route path="records/categories" element={<Categories />} />
            <Route path="records/fund-accounts" element={<Accounts />} />
            <Route path="records/budgets" element={<Budgets />} />
            <Route path="records/statistics" element={<Statistics />} />

            {/* 骑行模块 */}
            <Route path="cycling" element={<Cycling />} />

            {/* 健康模块 */}
            <Route path="health" element={<Health />} />
            <Route path="health/settings" element={<HealthSettings />} />

            {/* 股票分析模块 */}
            <Route path="stocks" element={<Stocks />} />

            {/* 用户模块 */}
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />

            {/* 兼容旧路由 - Dashboard */}
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="transactions" element={<Navigate to="/records" replace />} />
            <Route path="categories" element={<Navigate to="/records/categories" replace />} />
            <Route path="budgets" element={<Navigate to="/records/budgets" replace />} />
            <Route path="statistics" element={<Navigate to="/records/statistics" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
