import { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Select, Button, message, Space } from 'antd';
import { SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';

const HealthSettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getHealthProfile();
      if (data && data.height) {
        setHasProfile(true);
        form.setFieldsValue(data);
      }
    } catch (error) {
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (hasProfile) {
        await api.updateHealthProfile(values);
        message.success('更新成功');
      } else {
        await api.createHealthProfile(values);
        message.success('创建成功');
        setHasProfile(true);
      }
    } catch (error) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteHealthProfile();
      message.success('删除成功');
      form.resetFields();
      setHasProfile(false);
    } catch (error) {
      message.error('删除失败');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Card title="身体设置">
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            background: '#f0f5ff',
            borderRadius: 8,
            border: '1px solid #adc6ff',
          }}
        >
          <p style={{ margin: 0, color: '#1677ff' }}>
            ℹ️ 身高等基础信息一般不会变化，只需在首次使用或发生变化时设置。
          </p>
        </div>

        <Form form={form} layout="vertical">
          <Form.Item
            name="height"
            label="身高 (cm)"
            rules={[{ required: true, message: '请输入身高' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="例如: 175" min={50} max={250} />
          </Form.Item>

          <Form.Item
            name="weight"
            label="体重 (kg)"
            rules={[{ required: true, message: '请输入体重' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="例如: 70" min={30} max={200} />
          </Form.Item>

          <Form.Item name="age" label="年龄">
            <InputNumber style={{ width: '100%' }} placeholder="例如: 25" min={1} max={120} />
          </Form.Item>

          <Form.Item name="gender" label="性别">
            <Select placeholder="请选择性别">
              <Select.Option value="male">男</Select.Option>
              <Select.Option value="female">女</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="targetWeight" label="目标体重 (kg)">
            <InputNumber style={{ width: '100%' }} placeholder="例如: 65" min={30} max={200} />
          </Form.Item>

          <Form.Item name="activityLevel" label="活动水平">
            <Select placeholder="请选择活动水平">
              <Select.Option value="sedentary">久坐（很少运动）</Select.Option>
              <Select.Option value="light">轻度活动（每周1-3次运动）</Select.Option>
              <Select.Option value="moderate">中度活动（每周3-5次运动）</Select.Option>
              <Select.Option value="active">高度活动（每周6-7次运动）</Select.Option>
              <Select.Option value="very_active">极高活动（每天运动/体力工作）</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSubmit}>
                {hasProfile ? '更新' : '保存'}
              </Button>
              {hasProfile && (
                <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                  删除
                </Button>
              )}
              <Button onClick={() => navigate('/health')}>返回</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default HealthSettings;
