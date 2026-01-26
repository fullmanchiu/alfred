import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Descriptions, Button, Empty, message } from 'antd';
import { HeartOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';

const Health = () => {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const [profileData, historyData] = await Promise.all([
        api.getHealthProfile(),
        api.getHealthHistory(),
      ]);
      setProfile(profileData);
      setHistory(historyData);
    } catch (error) {
      console.error('加载健康数据失败:', error);
      message.error('加载健康数据失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = (weight?: number, height?: number) => {
    if (!weight || !height) return '-';
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { text: '偏瘦', color: '#faad14' };
    if (bmi < 24) return { text: '正常', color: '#52c41a' };
    if (bmi < 28) return { text: '超重', color: '#faad14' };
    return { text: '肥胖', color: '#ff4d4f' };
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Card
        title={
          <span>
            <HeartOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            健康概览
          </span>
        }
        extra={
          <Button icon={<EditOutlined />} onClick={() => navigate('/health/settings')}>
            编辑
          </Button>
        }
        style={{ marginBottom: 24 }}
        loading={loading}
      >
        {!profile ? (
          <Empty description="暂无健康数据，请先设置身体信息">
            <Button type="primary" onClick={() => navigate('/health/settings')}>
              立即设置
            </Button>
          </Empty>
        ) : (
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="体重" value={profile.weight} suffix="kg" />
            </Col>
            <Col span={6}>
              <Statistic title="身高" value={profile.height} suffix="cm" />
            </Col>
            <Col span={6}>
              <Statistic
                title="BMI"
                value={calculateBMI(profile.weight, profile.height)}
                valueStyle={{
                  color: getBMIStatus(
                    parseFloat(calculateBMI(profile.weight, profile.height))
                  ).color,
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="状态"
                value={
                  getBMIStatus(parseFloat(calculateBMI(profile.weight, profile.height))).text
                }
                valueStyle={{
                  color: getBMIStatus(
                    parseFloat(calculateBMI(profile.weight, profile.height))
                  ).color,
                }}
              />
            </Col>
          </Row>
        )}
      </Card>

      {profile && (
        <Card title="详细信息" style={{ marginBottom: 24 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="年龄">{profile.age || '-'}</Descriptions.Item>
            <Descriptions.Item label="性别">
              {profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="目标体重">{profile.targetWeight || '-'} kg</Descriptions.Item>
            <Descriptions.Item label="活动水平">{profile.activityLevel || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {history && history.records && history.records.length > 0 && (
        <Card title="历史记录">
          <p>最近 {history.records.length} 条记录</p>
          {/* TODO: 添加历史记录图表 */}
        </Card>
      )}
    </div>
  );
};

export default Health;
