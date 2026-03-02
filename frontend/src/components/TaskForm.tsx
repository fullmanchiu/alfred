import { Form, Input, Select, Switch, Button, TimePicker, Radio, InputNumber, message } from 'antd';
import { ScheduleTaskRequest } from '@/types/task';
import type { Task } from '@/types/task';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface TaskFormProps {
  onSubmit: (task: ScheduleTaskRequest) => Promise<void>;
  loading?: boolean;
  task?: Task; // 编辑模式下传入任务数据
}

interface WatchlistStock {
  code: string;
  name: string;
}

// 将用户友好的选项转换为 Cron 表达式
function convertToCron(frequency: string, time?: dayjs.Dayjs, weekday?: number): string {
  const hour = time?.hour() ?? 0;
  const minute = time?.minute() ?? 0;

  switch (frequency) {
    case 'daily':
      return `${minute} ${hour} * * *`;
    case 'weekly':
      return `${minute} ${hour} * * ${weekday ?? 1}`;
    case 'hourly':
      return `${minute} * * * *`;
    default:
      return `${minute} ${hour} * * *`;
  }
}

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, loading, task }) => {
  const [form] = Form.useForm();
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const isEdit = !!task;

  // 获取用户自选股列表
  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        setLoadingWatchlist(true);
        const response = await api.getStocks() as any;
        const stocks = response.data || response;
        setWatchlist(stocks.map((s: any) => ({ code: s.code, name: s.name })));
      } catch (error) {
        console.error('获取自选股失败', error);
      } finally {
        setLoadingWatchlist(false);
      }
    };
    fetchWatchlist();
  }, []);

  // 编辑模式：预填充表单数据
  useEffect(() => {
    if (task) {
      // 解析 scheduleRule 获取调度参数
      let frequency = 'none';
      let time = dayjs().hour(9).minute(0);
      let weekday = 1;
      let intervalMinutes = 60;

      if (task.scheduleRule) {
        const [type, value] = task.scheduleRule.split(':');
        if (type === 'cron') {
          // 解析 cron 表达式 "minute hour * * *" 或 "minute hour * * weekday"
          const parts = value.split(' ');
          const hour = parseInt(parts[1]) || 0;
          const minute = parseInt(parts[0]) || 0;
          time = dayjs().hour(hour).minute(minute);

          const weekdayPart = parts[4];
          if (weekdayPart !== '*') {
            frequency = 'weekly';
            weekday = parseInt(weekdayPart);
          } else if (parts[3] === '*') {
            frequency = 'daily';
          } else {
            frequency = 'hourly';
          }
        } else if (type === 'interval') {
          frequency = 'custom_interval';
          intervalMinutes = parseInt(value) / 60;
        }
      }

      // 解析 params JSON
      let taskParams = {};
      try {
        taskParams = task.params ? JSON.parse(task.params) : {};
      } catch (e) {
        console.error('解析任务参数失败', e);
      }

      // 设置表单初始值
      form.setFieldsValue({
        name: task.name,
        taskType: task.taskType,
        frequency,
        time,
        weekday,
        intervalMinutes,
        autoRun: task.autoRun,
        stockCode: (taskParams as any).stock_code || '000001',
        days: (taskParams as any).days || 30,
        market: (taskParams as any).market || 'sz',
        watchlistCodes: (taskParams as any).codes || [],
      });
    } else {
      form.resetFields();
    }
  }, [task, form]);

  const handleSubmit = async (values: any) => {
    // 构建调度参数
    let scheduleType: string | undefined;
    let cronExpr: string | undefined;
    let intervalSeconds: number | undefined;

    // 根据频率设置调度参数
    if (values.frequency === 'none') {
      // 不启用调度
      scheduleType = undefined;
    } else if (values.frequency === 'custom_interval') {
      scheduleType = 'interval';
      intervalSeconds = values.intervalMinutes * 60;
    } else {
      scheduleType = 'cron';
      cronExpr = convertToCron(values.frequency, values.time, values.weekday);
    }

    // 构建任务参数
    let taskParams: any = {};

    // 根据任务类型添加参数
    if (values.taskType === 'sync_klines') {
      taskParams = {
        stock_code: values.stockCode || '000001',
        days: values.days || 30
      };
    } else if (values.taskType === 'fetch_market_klines') {
      taskParams = {
        market: values.market || 'sz',
        days: values.days || 30
      };
    } else if (values.taskType === 'fetch_watchlist_klines') {
      // 获取选中的自选股代码
      const selectedCodes = values.watchlistCodes || [];
      if (selectedCodes.length === 0) {
        message.error('请至少选择一只自选股');
        return;
      }
      taskParams = {
        codes: selectedCodes,
        days: values.days || 30
      };
    }

    const task: ScheduleTaskRequest = {
      name: values.name,
      taskType: values.taskType,
      scheduleType,
      cronExpr,
      intervalSeconds,
      autoRun: values.autoRun ?? false,
      params: JSON.stringify(taskParams)
    };
    await onSubmit(task);
    form.resetFields();
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item
        name="name"
        label="任务名称"
        rules={[{ required: true, message: '请输入任务名称' }]}
      >
        <Input placeholder="例如: 股票数据同步" />
      </Form.Item>

      <Form.Item
        name="taskType"
        label="任务类型"
        rules={[{ required: true, message: '请选择任务类型' }]}
      >
        <Select placeholder="选择任务类型">
          <Select.Option value="fetch_market_klines">全市场K线获取</Select.Option>
          <Select.Option value="fetch_watchlist_klines">自选股K线获取</Select.Option>
          <Select.Option value="sync_klines">单只股票同步</Select.Option>
          <Select.Option value="calculate_indicators">技术指标计算</Select.Option>
          <Select.Option value="hello">测试任务</Select.Option>
        </Select>
      </Form.Item>

      {/* 任务参数 - 根据任务类型显示不同字段 */}
      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.taskType !== curr.taskType}>
        {({ getFieldValue }) => {
          const taskType = getFieldValue('taskType');

          // sync_klines: 单只股票代码 + 天数
          if (taskType === 'sync_klines') {
            return (
              <>
                <Form.Item
                  name="stockCode"
                  label="股票代码"
                  rules={[{ required: true, message: '请输入股票代码' }]}
                  initialValue="000001"
                  tooltip="6位股票代码，如 000001、600000"
                >
                  <Input placeholder="000001" maxLength={6} />
                </Form.Item>
                <Form.Item
                  name="days"
                  label="获取天数"
                  rules={[{ required: true, message: '请输入获取天数' }]}
                  initialValue={30}
                >
                  <InputNumber min={1} max={3650} style={{ width: '100%' }} placeholder="30" />
                </Form.Item>
              </>
            );
          }

          // fetch_market_klines: 市场范围 + 天数
          if (taskType === 'fetch_market_klines') {
            return (
              <>
                <Form.Item
                  name="market"
                  label="市场范围"
                  rules={[{ required: true, message: '请选择市场范围' }]}
                  initialValue="sz"
                >
                  <Select>
                    <Select.Option value="sz">深圳</Select.Option>
                    <Select.Option value="sh">上海</Select.Option>
                    <Select.Option value="all">全市场</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="days"
                  label="获取天数"
                  rules={[{ required: true, message: '请输入获取天数' }]}
                  initialValue={30}
                >
                  <InputNumber min={1} max={3650} style={{ width: '100%' }} placeholder="30" />
                </Form.Item>
              </>
            );
          }

          // fetch_watchlist_klines: 自选股选择 + 天数
          if (taskType === 'fetch_watchlist_klines') {
            return (
              <>
                <Form.Item
                  name="watchlistCodes"
                  label="选择自选股"
                  rules={[{ required: true, message: '请至少选择一只自选股' }]}
                  tooltip="按住 Ctrl/Cmd 可多选"
                >
                  <Select
                    mode="multiple"
                    placeholder="选择自选股（可多选）"
                    loading={loadingWatchlist}
                    optionFilterProp="children"
                    showSearch
                  >
                    {watchlist.map(stock => (
                      <Select.Option key={stock.code} value={stock.code}>
                        {stock.code} - {stock.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  name="days"
                  label="获取天数"
                  rules={[{ required: true, message: '请输入获取天数' }]}
                  initialValue={30}
                >
                  <InputNumber min={1} max={3650} style={{ width: '100%' }} placeholder="30" />
                </Form.Item>
              </>
            );
          }

          return null;
        }}
      </Form.Item>

      {/* 调度规则 */}
      <Form.Item
        name="frequency"
        label="调度规则"
        rules={[{ required: true, message: '请选择调度规则' }]}
        initialValue="none"
      >
        <Radio.Group>
          <Radio.Button value="none">不启用调度</Radio.Button>
          <Radio.Button value="hourly">每小时</Radio.Button>
          <Radio.Button value="daily">每天</Radio.Button>
          <Radio.Button value="weekly">每周</Radio.Button>
          <Radio.Button value="custom_interval">自定义间隔</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {/* 每周 - 选择星期 */}
      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.frequency !== curr.frequency}>
        {({ getFieldValue }) =>
          getFieldValue('frequency') === 'weekly' ? (
            <Form.Item
              name="weekday"
              label="星期"
              rules={[{ required: true, message: '请选择星期' }]}
              initialValue={1}
            >
              <Select>
                <Select.Option value={1}>周一</Select.Option>
                <Select.Option value={2}>周二</Select.Option>
                <Select.Option value={3}>周三</Select.Option>
                <Select.Option value={4}>周四</Select.Option>
                <Select.Option value={5}>周五</Select.Option>
                <Select.Option value={6}>周六</Select.Option>
                <Select.Option value={0}>周日</Select.Option>
              </Select>
            </Form.Item>
          ) : null
        }
      </Form.Item>

      {/* 每小时/每天/每周 - 选择时间 */}
      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.frequency !== curr.frequency}>
        {({ getFieldValue }) =>
          ['hourly', 'daily', 'weekly'].includes(getFieldValue('frequency')) ? (
            <Form.Item
              name="time"
              label="执行时间"
              rules={[{ required: true, message: '请选择执行时间' }]}
              initialValue={dayjs().hour(9).minute(0)}
            >
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          ) : null
        }
      </Form.Item>

      {/* 自定义间隔 - 输入分钟数 */}
      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.frequency !== curr.frequency}>
        {({ getFieldValue }) =>
          getFieldValue('frequency') === 'custom_interval' ? (
            <Form.Item
              name="intervalMinutes"
              label="间隔时间（分钟）"
              rules={[{ required: true, message: '请输入间隔时间' }]}
              initialValue={60}
            >
              <InputNumber min={1} max={525600} style={{ width: '100%' }} placeholder="60" />
            </Form.Item>
          ) : null
        }
      </Form.Item>

      {/* 自动执行开关 */}
      <Form.Item
        name="autoRun"
        label="自动执行"
        valuePropName="checked"
        initialValue={false}
        tooltip="开启后，任务将按照调度规则自动执行。关闭后只能手动执行。"
      >
        <Switch checkedChildren="开启" unCheckedChildren="关闭" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          {isEdit ? '更新任务' : '创建任务'}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default TaskForm;
