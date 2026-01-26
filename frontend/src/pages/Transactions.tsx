import { useState, useEffect, useRef } from 'react';
import {
  Button,
  message,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  DatePicker,
  Space,
  Card,
  List,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import type { Transaction, Category, Account } from '@/types';
import type { FormInstance } from 'antd/es/form';
import dayjs from 'dayjs';

const Transactions = () => {
  const [records, setRecords] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Transaction | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const formRef = useRef<FormInstance>(null);

  useEffect(() => {
    loadRecords();
    loadCategories();
    loadAccounts();
  }, [pagination.current, pagination.pageSize]);

  const loadRecords = async (filters?: any) => {
    try {
      setLoading(true);
      const data = await api.getTransactions({
        current: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });
      setRecords(data.content || []);
      setPagination({
        ...pagination,
        total: data.totalElements || 0,
      });
    } catch (error) {
      message.error('加载记账失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (error) {
      message.error('加载分类失败');
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await api.getAccounts();
      setAccounts(data);
    } catch (error) {
      message.error('加载账户失败');
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setModalVisible(true);
    formRef.current?.resetFields();
    formRef.current?.setFieldsValue({
      transactionDate: dayjs(),
      type: 'expense',
    });
  };

  const handleEdit = (record: Transaction) => {
    setEditingRecord(record);
    setModalVisible(true);
    formRef.current?.setFieldsValue({
      ...record,
      transactionDate: dayjs(record.transactionDate),
    });
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条记账吗？',
      onOk: async () => {
        try {
          await api.deleteTransaction(id);
          message.success('删除成功');
          loadRecords();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await formRef.current?.validateFields();
      const data = {
        ...values,
        transactionDate: values.transactionDate.format('YYYY-MM-DD'),
      };

      if (editingRecord) {
        await api.updateTransaction(editingRecord.id, data);
        message.success('更新成功');
      } else {
        await api.createTransaction(data);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadRecords();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 按日期分组记录
  const groupedRecords = records.reduce((groups: Record<string, Transaction[]>, record) => {
    const date = dayjs(record.transactionDate).format('YYYY-MM-DD');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {});

  // 计算每日收支
  const getDailySummary = (date: string) => {
    const dayRecords = groupedRecords[date];
    const income = dayRecords
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);
    const expense = dayRecords
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);
    return { income, expense };
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || `#${categoryId}`;
  };

  const getCategoryIcon = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category?.iconName) return '💰';
    try {
      return String.fromCharCode(parseInt(category.iconName, 16));
    } catch {
      return '💰';
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* 悬浮添加按钮 */}
      <Button
        type="primary"
        size="large"
        icon={<PlusOutlined />}
        onClick={handleAdd}
        style={{
          position: 'fixed',
          bottom: 40,
          right: 40,
          borderRadius: 30,
          height: 56,
          width: 56,
          fontSize: 24,
          boxShadow: '0 4px 12px rgba(22, 119, 255, 0.4)',
          zIndex: 1000,
        }}
      />

      {/* 记账列表 */}
      <div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : Object.keys(groupedRecords).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📝</div>
            <div style={{ fontSize: 16, color: '#999' }}>暂无记账记录</div>
            <div style={{ fontSize: 14, color: '#ccc', marginTop: 8 }}>点击右下角 + 号开始记账</div>
          </div>
        ) : (
          Object.entries(groupedRecords)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, dayRecords]) => {
              const summary = getDailySummary(date);
              const isToday = date === dayjs().format('YYYY-MM-DD');
              const isYesterday = date === dayjs().subtract(1, 'day').format('YYYY-MM-DD');

              let dateLabel = dayjs(date).format('MM月DD日');
              if (isToday) dateLabel = '今天';
              if (isYesterday) dateLabel = '昨天';

              return (
                <Card
                  key={date}
                  style={{ marginBottom: 16 }}
                  title={
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 16 }}>
                        {dateLabel}
                        <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
                          {dayjs(date).format('周dd')}
                        </span>
                      </span>
                      <Space>
                        {summary.income > 0 && (
                          <span style={{ color: '#52c41a', fontSize: 14 }}>
                            收 ¥{summary.income.toFixed(2)}
                          </span>
                        )}
                        {summary.expense > 0 && (
                          <span style={{ color: '#ff4d4f', fontSize: 14 }}>
                            支 ¥{summary.expense.toFixed(2)}
                          </span>
                        )}
                      </Space>
                    </Space>
                  }
                  bordered={false}
                >
                  <List
                    dataSource={dayRecords}
                    renderItem={(item) => (
                      <List.Item
                        style={{
                          padding: '12px 0',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleEdit(item)}
                      >
                        <List.Item.Meta
                          avatar={
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                background: item.type === 'expense' ? '#fff1f0' : '#f6ffed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 24,
                              }}
                            >
                              {getCategoryIcon(item.categoryId)}
                            </div>
                          }
                          title={
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 16 }}>{getCategoryName(item.categoryId)}</span>
                              <span
                                style={{
                                  fontSize: 18,
                                  fontWeight: 'bold',
                                  color: item.type === 'expense' ? '#ff4d4f' : '#52c41a',
                                }}
                              >
                                {item.type === 'expense' ? '-' : '+'}
                                ¥{item.amount.toFixed(2)}
                              </span>
                            </Space>
                          }
                          description={
                            item.notes ? (
                              <span style={{ fontSize: 13, color: '#999' }}>{item.notes}</span>
                            ) : (
                              <span style={{ fontSize: 13, color: '#ccc' }}>无备注</span>
                            )
                          }
                        />
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          style={{ marginLeft: 8 }}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              );
            })
        )}
      </div>

      {/* 分页 */}
      {pagination.total > pagination.pageSize && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space>
            <Button
              disabled={pagination.current === 1}
              onClick={() => setPagination({ ...pagination, current: pagination.current - 1 })}
            >
              上一页
            </Button>
            <span>
              第 {pagination.current} 页，共 {Math.ceil(pagination.total / pagination.pageSize)} 页
            </span>
            <Button
              disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
              onClick={() => setPagination({ ...pagination, current: pagination.current + 1 })}
            >
              下一页
            </Button>
          </Space>
        </div>
      )}

      {/* 记账弹窗 */}
      <Modal
        title={editingRecord ? '编辑记账' : '记一笔'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={480}
        okText="保存"
        cancelText="取消"
      >
        <Form
          ref={formRef as any}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select size="large" placeholder="请选择">
              <Select.Option value="expense">
                <span style={{ color: '#ff4d4f' }}>⬇️ 支出</span>
              </Select.Option>
              <Select.Option value="income">
                <span style={{ color: '#52c41a' }}>⬆️ 收入</span>
              </Select.Option>
              <Select.Option value="transfer">
                <span style={{ color: '#1677ff' }}>↔️ 转账</span>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="金额"
            rules={[{ required: true, message: '请输入金额' }]}
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

          <Form.Item
            name="categoryId"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select size="large" placeholder="请选择分类">
              {categories
                .filter((c) => c.type === 'expense' || c.type === 'income')
                .map((cat) => (
                  <Select.Option key={cat.id} value={cat.id}>
                    {cat.iconName && (
                      <span style={{ marginRight: 8 }}>
                        {String.fromCharCode(parseInt(cat.iconName, 16))}
                      </span>
                    )}
                    {cat.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="accountId"
            label="账户"
            rules={[{ required: true, message: '请选择账户' }]}
          >
            <Select size="large" placeholder="请选择账户">
              {accounts.map((acc) => (
                <Select.Option key={acc.id} value={acc.id}>
                  {acc.accountName} (¥{acc.balance.toFixed(2)})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="transactionDate" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker size="large" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <Input.TextArea placeholder="选填，如：午餐、打车等" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Transactions;
