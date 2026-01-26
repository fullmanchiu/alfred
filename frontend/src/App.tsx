import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Home from './pages/Home';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Statistics from './pages/Statistics';
import Cycling from './pages/Cycling';
import Health from './pages/Health';
import HealthSettings from './pages/HealthSettings';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import { getToken } from './utils/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <BrowserRouter>
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
            <Route path="records/accounts" element={<Accounts />} />
            <Route path="records/budgets" element={<Budgets />} />
            <Route path="records/statistics" element={<Statistics />} />

            {/* 骑行模块 */}
            <Route path="cycling" element={<Cycling />} />

            {/* 健康模块 */}
            <Route path="health" element={<Health />} />
            <Route path="health/settings" element={<HealthSettings />} />

            {/* 用户模块 */}
            <Route path="profile" element={<Profile />} />

            {/* 兼容旧路由 - Dashboard */}
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="accounts" element={<Navigate to="/records/accounts" replace />} />
            <Route path="transactions" element={<Navigate to="/records" replace />} />
            <Route path="categories" element={<Navigate to="/records/categories" replace />} />
            <Route path="budgets" element={<Navigate to="/records/budgets" replace />} />
            <Route path="statistics" element={<Navigate to="/records/statistics" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
