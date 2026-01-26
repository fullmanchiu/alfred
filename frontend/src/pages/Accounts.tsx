import { useState, useEffect } from 'react';
import {
  Button,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Card,
  Row,
  Col,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import type { Account } from '@/types';

const Accounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await api.getAccounts();
      setAccounts(data);
    } catch (error) {
      message.error('加载账户失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingAccount(null);
    setModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      accountType: 'cash',
      isActive: true,
    });
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setModalVisible(true);
    form.setFieldsValue(account);
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个账户吗？',
      onOk: async () => {
        try {
          await api.deleteAccount(id);
          message.success('删除成功');
          loadAccounts();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingAccount) {
        await api.updateAccount(editingAccount.id, values);
        message.success('更新成功');
      } else {
        await api.createAccount(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadAccounts();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getAccountIcon = (type: string) => {
    const icons: Record<string, string> = {
      cash: '💵',
      bank: '🏦',
      credit: '💳',
      alipay: '🔵',
      wechat: '🟢',
    };
    return icons[type] || '💰';
  };

  const getAccountTypeName = (type: string) => {
    const typeNames: Record<string, string> = {
      cash: '现金',
      bank: '银行账户',
      credit: '信用卡',
      alipay: '支付宝',
      wechat: '微信',
    };
    return typeNames[type] || type;
  };

  // 计算总资产
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const activeAccounts = accounts.filter((acc) => acc.isActive);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* 总资产卡片 */}
      <Card
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          border: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>总资产</div>
            <div style={{ fontSize: 36, fontWeight: 'bold' }}>¥{totalBalance.toFixed(2)}</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>
              共 {activeAccounts.length} 个账户
            </div>
          </div>
          <div style={{ fontSize: 64, opacity: 0.3 }}>💰</div>
        </div>
      </Card>

      {/* 添加账户按钮 */}
      <div style={{ marginBottom: 24 }}>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          style={{ borderRadius: 20 }}
        >
          添加账户
        </Button>
      </div>

      {/* 账户卡片列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
      ) : accounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>💳</div>
          <div style={{ fontSize: 16, color: '#999' }}>暂无账户</div>
          <div style={{ fontSize: 14, color: '#ccc', marginTop: 8 }}>点击上方按钮添加账户</div>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {accounts.map((account) => (
            <Col key={account.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                style={{
                  position: 'relative',
                  opacity: account.isActive ? 1 : 0.5,
                  border: '1px solid #f0f0f0',
                  borderRadius: 12,
                }}
                bodyStyle={{ padding: 20 }}
              >
                {/* 账户图标 */}
                <div
                  style={{
                    fontSize: 40,
                    marginBottom: 12,
                    textAlign: 'center',
                  }}
                >
                  {getAccountIcon(account.accountType)}
                </div>

                {/* 账户名称 */}
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    textAlign: 'center',
                    marginBottom: 8,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {account.accountName}
                </div>

                {/* 账户类型 */}
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <Tag color={account.isActive ? 'blue' : 'default'}>
                    {getAccountTypeName(account.accountType)}
                  </Tag>
                </div>

                {/* 余额 */}
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#1677ff',
                  }}
                >
                  ¥{account.balance.toFixed(2)}
                </div>

                {/* 状态 */}
                {!account.isActive && (
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 12,
                      color: '#999',
                      marginTop: 8,
                    }}
                  >
                    已停用
                  </div>
                )}

                {/* 操作按钮 */}
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(account)}
                    >
                      编辑
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(account.id)}
                    >
                      删除
                    </Button>
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 添加/编辑账户弹窗 */}
      <Modal
        title={editingAccount ? '编辑账户' : '添加账户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={480}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="accountName"
            label="账户名称"
            rules={[{ required: true, message: '请输入账户名称' }]}
          >
            <Input size="large" placeholder="例如：工资卡、零钱包" />
          </Form.Item>

          <Form.Item
            name="accountType"
            label="账户类型"
            rules={[{ required: true, message: '请选择账户类型' }]}
          >
            <Select size="large" placeholder="请选择账户类型">
              <Select.Option value="cash">
                <span style={{ marginRight: 8 }}>💵</span>
                现金
              </Select.Option>
              <Select.Option value="bank">
                <span style={{ marginRight: 8 }}>🏦</span>
                银行账户
              </Select.Option>
              <Select.Option value="credit">
                <span style={{ marginRight: 8 }}>💳</span>
                信用卡
              </Select.Option>
              <Select.Option value="alipay">
                <span style={{ marginRight: 8 }}>🔵</span>
                支付宝
              </Select.Option>
              <Select.Option value="wechat">
                <span style={{ marginRight: 8 }}>🟢</span>
                微信
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="balance"
            label="初始余额"
            rules={[{ required: true, message: '请输入初始余额' }]}
          >
            <InputNumber
              size="large"
              style={{ width: '100%' }}
              placeholder="0.00"
              precision={2}
              min={0}
              prefix="¥"
            />
          </Form.Item>

          <Form.Item name="isActive" label="状态" valuePropName="checked" initialValue={true}>
            <Select size="large">
              <Select.Option value={true}>启用</Select.Option>
              <Select.Option value={false}>停用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Accounts;
