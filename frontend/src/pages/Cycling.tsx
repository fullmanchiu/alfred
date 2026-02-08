import { useState, useEffect } from 'react';
import { Card, Tag, Button, Empty, Space, Modal, Form, Input, Select, DatePicker, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import dayjs from 'dayjs';

interface Activity {
  id: number;
  activityType: string;
  startTime: string;
  duration?: number;
  distance?: number;
  calories?: number;
  notes?: string;
}

const Cycling = () => {
  const { message } = App.useApp();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await api.getActivities({ current: 1, pageSize: 50 });
      // 过滤出骑行相关的活动
      const cyclingActivities = (data.content || data || []).filter(
        (a: Activity) => a.activityType?.toLowerCase().includes('cycling') || a.activityType?.toLowerCase().includes('骑行')
      );
      setActivities(cyclingActivities);
    } catch (error) {
      message.error('加载活动失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingActivity(null);
    setModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      activityType: 'cycling',
      startTime: dayjs(),
    });
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setModalVisible(true);
    form.setFieldsValue({
      ...activity,
      startTime: dayjs(activity.startTime),
    });
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条活动记录吗？',
      onOk: async () => {
        try {
          await api.deleteActivity(id);
          message.success('删除成功');
          loadActivities();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        startTime: values.startTime.format('YYYY-MM-DD HH:mm:ss'),
      };

      if (editingActivity) {
        await api.updateActivity(editingActivity.id, data);
        message.success('更新成功');
      } else {
        await api.createActivity(data);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadActivities();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return '-';
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    } else {
      return `${meters.toFixed(1)} m`;
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Card
        title="骑行活动"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加活动
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>加载中...</div>
        ) : activities.length === 0 ? (
          <Empty description="暂无骑行记录" />
        ) : (
          <div>
            {activities.map((item) => (
              <Card
                key={item.id}
                style={{ marginBottom: 16 }}
                actions={[
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(item)}
                  >
                    编辑
                  </Button>,
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(item.id)}
                  >
                    删除
                  </Button>,
                ]}
              >
                <Space>
                  <span>🚴 骑行活动</span>
                  <Tag color="blue">{dayjs(item.startTime).format('YYYY-MM-DD')}</Tag>
                </Space>
                <div style={{ marginTop: 8 }}>
                  <Space size="large">
                    <span>⏱️ 时长: {formatDuration(item.duration)}</span>
                    <span>📍 距离: {formatDistance(item.distance)}</span>
                    {item.calories && <span>🔥 消耗: {item.calories} kcal</span>}
                    {item.notes && <span>📝 {item.notes}</span>}
                  </Space>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Modal
        title={editingActivity ? '编辑活动' : '添加活动'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="activityType"
            label="活动类型"
            rules={[{ required: true, message: '请选择活动类型' }]}
          >
            <Select>
              <Select.Option value="cycling">骑行</Select.Option>
              <Select.Option value="running">跑步</Select.Option>
              <Select.Option value="walking">步行</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="startTime"
            label="开始时间"
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="duration" label="时长（秒）">
            <Input type="number" placeholder="例如: 3600" />
          </Form.Item>

          <Form.Item name="distance" label="距离（米）">
            <Input type="number" placeholder="例如: 5200" />
          </Form.Item>

          <Form.Item name="calories" label="消耗热量（kcal）">
            <Input type="number" placeholder="例如: 300" />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <Input.TextArea placeholder="可选" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Cycling;
