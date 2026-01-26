import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Avatar, Space, Descriptions, Modal } from 'antd';
import { UserOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { api } from '@/services/api';

const Profile = () => {
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
      content: '确定要重置所有数据吗？此操作不可恢复！',
      okText: '确认',
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

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Card title="个人资料" loading={loading}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Avatar size={80} icon={<UserOutlined />} style={{ marginBottom: 16 }} />
          <h2>{userData?.nickname || userData?.username || '用户'}</h2>
          <p style={{ color: '#666' }}>{userData?.email || '-'}</p>
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

        <div style={{ marginTop: 24, textAlign: 'center' }}>
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

      <Card title="数据管理" style={{ marginTop: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <p style={{ marginBottom: 8 }}>
              重置所有数据将删除你的记账、活动、健康等所有数据，此操作不可恢复。
            </p>
            <Button danger onClick={handleResetData}>
              重置所有数据
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default Profile;
