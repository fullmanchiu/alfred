import { Form, Input, Button, Card, Modal } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '@/services/api';
import { setToken, setRefreshToken } from '@/utils/auth';
import type { LoginResponse } from '@/types';
import { App } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await api.login(values.username, values.password) as LoginResponse;
      setToken(response.token);
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken);
      }
      message.success('登录成功');
      onLoginSuccess();

      // 检查分类版本更新
      try {
        const versionInfo = await api.checkCategoryVersion();
        if (versionInfo.hasUpdate) {
          // 显示更新提示弹窗
          Modal.confirm({
            title: '系统分类已更新',
            icon: <ExclamationCircleOutlined />,
            content: (
              <div>
                <p>检测到系统分类有新版本可用：</p>
                <p>当前版本：{versionInfo.dbVersion}</p>
                <p>最新版本：{versionInfo.configVersion}</p>
                <p>是否立即更新到最新版本？</p>
              </div>
            ),
            okText: '立即更新',
            cancelText: '稍后提醒',
            onOk: async () => {
              try {
                const syncResult = await api.syncSystemCategories();
                if (syncResult.synced) {
                  message.success('分类已更新到最新版本');
                } else {
                  message.info('分类已是最新版本');
                }
              } catch (error: any) {
                message.error('更新分类失败：' + (error.response?.data?.message || '未知错误'));
              }
            },
            onCancel: () => {
              // 用户选择稍后更新，直接跳转
            },
            afterClose: () => {
              navigate('/dashboard');
            },
          });
        } else {
          // 没有更新，直接跳转
          navigate('/dashboard');
        }
      } catch (error) {
        // 版本检查失败，不影响登录，直接跳转
        console.error('检查分类版本失败：', error);
        navigate('/dashboard');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card
        title="Alfred - 智能生活管家"
        style={{ width: '25rem' }}
      >
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            还没有账号？ <Link to="/register">立即注册</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
