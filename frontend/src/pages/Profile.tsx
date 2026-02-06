import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Avatar, Space, Descriptions, Modal, Divider, List } from 'antd';
import { UserOutlined, EditOutlined, SaveOutlined, RightOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

const Profile = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getUserProfile();
      setUserData(data);
      form.setFieldsValue(data);
    } catch (error) {
      message.error('加载用户资料失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await api.updateUserProfile(values);
      message.success('更新成功');
      setUserData({ ...userData, ...values });
      setEditing(false);
    } catch (error) {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = () => {
    Modal.confirm({
      title: '确认重置',
      content: '确定要重置所有数据吗？此操作将删除所有记账、活动、健康等数据，此操作不可恢复！',
      okText: '确认重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.resetUserData();
          message.success('数据已重置');
          loadUserProfile();
        } catch (error) {
          message.error('重置失败');
        }
      },
    });
  };

  const quickActions = [
    {
      title: '身体数据',
      description: '设置身高、体重等基础信息',
      icon: <UserOutlined />,
      onClick: () => navigate('/health/settings'),
    },
    {
      title: '修改密码',
      description: '更改您的登录密码',
      icon: <LockOutlined />,
      onClick: () => message.info('密码修改功能开发中...'),
    },
  ];

  return (
    <div style={{ padding: 'var(--spacing-xl)', maxWidth: '50rem', margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 个人资料卡片 */}
        <Card title="个人资料" loading={loading}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Avatar size={80} icon={<UserOutlined />} style={{ marginBottom: '1rem' }} />
            <h2>{userData?.nickname || userData?.username || '用户'}</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>{userData?.email || '-'}</p>
          </div>

          {!editing ? (
            <Descriptions column={1} bordered>
              <Descriptions.Item label="用户名">{userData?.username || '-'}</Descriptions.Item>
              <Descriptions.Item label="昵称">{userData?.nickname || '-'}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{userData?.email || '-'}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Form form={form} layout="vertical">
              <Form.Item
                name="nickname"
                label="昵称"
                rules={[{ required: true, message: '请输入昵称' }]}
              >
                <Input placeholder="请输入昵称" />
              </Form.Item>

              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Form>
          )}

          <Divider />

          <div style={{ textAlign: 'center' }}>
            <Space>
              {!editing ? (
                <Button type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)}>
                  编辑资料
                </Button>
              ) : (
                <>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>
                    保存
                  </Button>
                  <Button onClick={() => {
                    setEditing(false);
                    form.setFieldsValue(userData);
                  }}>
                    取消
                  </Button>
                </>
              )}
            </Space>
          </div>
        </Card>

        {/* 快捷操作 */}
        <Card title="快捷操作">
          <List
            itemLayout="horizontal"
            dataSource={quickActions}
            renderItem={(item) => (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={item.onClick}
              >
                <List.Item.Meta
                  avatar={item.icon}
                  title={item.title}
                  description={item.description}
                />
                <RightOutlined style={{ color: 'var(--color-text-quaternary)' }} />
              </List.Item>
            )}
          />
        </Card>

        {/* 数据管理 */}
        <Card title="数据管理">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
                重置所有数据将删除你的记账、活动、健康等所有数据，此操作不可恢复。
              </p>
              <Button danger onClick={handleResetData}>
                重置所有数据
              </Button>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default Profile;
