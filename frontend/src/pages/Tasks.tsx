import { useEffect, useState, useRef } from 'react';
import { Table, Button, Tag, Space, Card, Modal, Progress, Collapse, App } from 'antd';
import { ReloadOutlined, PlayCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import { taskWebSocket } from '@/services/taskWebSocket';
import type { Task, TaskExecution } from '@/types/task';
import type { ScheduleTaskRequest } from '@/types/task';
import TaskForm from '@/components/TaskForm';

const Tasks: React.FC = () => {
  const { message } = App.useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [currentExecution, setCurrentExecution] = useState<TaskExecution | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTasks();
    fetchExecutions();

    // 设置初始刷新间隔
    const setupInterval = () => {
      const hasRunning = executions.some(e => e.status === 'RUNNING');
      const interval = hasRunning ? 3000 : 10000; // 有运行中的任务时每 3 秒刷新

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        fetchTasks();
        fetchExecutions();
      }, interval);
    };

    setupInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 当执行记录变化时，更新刷新间隔
  useEffect(() => {
    const hasRunning = executions.some(e => e.status === 'RUNNING');
    const interval = hasRunning ? 3000 : 10000;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      fetchTasks();
      fetchExecutions();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [executions]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.getTasks();
      // API 返回格式: { success: true, data: { tasks: [...] } }
      const taskList = response as any;
      setTasks(taskList.data?.tasks || taskList.tasks || []);
    } catch (error) {
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      const response = await api.getTaskExecutions();
      const executionList = response as any;
      setExecutions(executionList.data?.executions || executionList.executions || []);
    } catch (error) {
      console.error('获取执行记录失败', error);
    }
  };

  // 获取日志
  const fetchLogs = async (executionId: string, fromLine: number = 0) => {
    try {
      const response = await api.getExecutionLogs(executionId, fromLine) as any;
      if (response.success && response.data) {
        const { logs: newLogs } = response.data;
        setLogs(prev => [...prev, ...newLogs]);
      }
    } catch (error) {
      console.error('获取日志失败', error);
    }
  };

  const handleCreateTask = async (task: ScheduleTaskRequest) => {
    try {
      setFormSubmitting(true);
      if (editingTask) {
        // 更新任务
        await api.updateTask(editingTask.id!, task);
        message.success('任务更新成功');
      } else {
        // 创建任务
        await api.createTask(task);
        message.success('任务创建成功');
      }
      fetchTasks();
      setIsModalOpen(false);
      setEditingTask(undefined);
    } catch (error) {
      message.error(editingTask ? '更新任务失败' : '创建任务失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleToggleAutoRun = async (task: Task) => {
    try {
      await api.toggleTask(task.id!, !task.autoRun);
      message.success(`自动执行已${task.autoRun ? '关闭' : '开启'}`);
      fetchTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await api.deleteTask(taskId);
      message.success('任务已删除');
      fetchTasks();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleExecuteNow = async (task: Task) => {
    try {
      await api.executeTaskNow({
        taskName: task.name,
        taskType: task.taskType,
        params: task.params || '{}'
      });
      message.success('任务执行中...');
      // 刷新执行记录
      setTimeout(() => fetchExecutions(), 500);
    } catch (error) {
      message.error('启动任务失败');
    }
  };

  const handleCancelExecution = async (executionId: string) => {
    try {
      await api.cancelExecution(executionId);
      message.success('执行已取消');
      fetchExecutions();
    } catch (error) {
      message.error('取消执行失败');
    }
  };

  const handleViewLogs = async (execution: TaskExecution) => {
    try {
      // 从后端获取最新的执行记录数据
      const response = await api.getTaskExecution(execution.id) as any;
      if (response.success && response.data) {
        setCurrentExecution(response.data.execution);
      } else {
        // 如果获取失败，使用缓存的记录
        setCurrentExecution(execution);
      }
    } catch (error) {
      console.error('获取执行记录失败', error);
      // 出错时使用缓存的记录
      setCurrentExecution(execution);
    }

    // 重置日志并打开弹窗
    setLogs([]);
    setIsLogModalOpen(true);

    // 获取初始日志
    fetchLogs(execution.id, 0);

    // 连接 WebSocket 实时接收日志
    try {
      await taskWebSocket.connect(execution.id, (data) => {
        // 只处理当前执行记录的日志
        if (data.executionId === execution.id) {
          const logLine = `[${data.timestamp}] [${data.level}] ${data.message}`;
          setLogs(prev => [...prev, logLine]);
        }
      });
    } catch (error) {
      console.error('WebSocket 连接失败:', error);
    }
  };

  // 日志自动滚动到最新
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // 关闭日志弹窗时断开 WebSocket
  useEffect(() => {
    return () => {
      taskWebSocket.disconnect();
    };
  }, []);

  // 任务表格列
  const taskColumns = [
    { title: '任务名称', dataIndex: 'name', key: 'name' },
    {
      title: '任务类型',
      dataIndex: 'taskType',
      key: 'taskType',
      render: (type: string) => {
        const map: Record<string, string> = {
          fetch_market_klines: '全市场K线获取',
          fetch_watchlist_klines: '自选股K线获取',
          sync_klines: '单只股票同步',
          calculate_indicators: '指标计算',
          hello: '测试'
        };
        return map[type] || type;
      }
    },
    {
      title: '调度规则',
      key: 'rule',
      render: (_: any, record: Task) => {
        if (!record.scheduleRule) return '-';
        const [type, value] = record.scheduleRule.split(':');
        if (type === 'cron') {
          // 简单显示 cron 表达式
          return `Cron: ${value}`;
        }
        if (type === 'interval') {
          const seconds = parseInt(value);
          if (seconds >= 3600) return `每 ${seconds / 3600} 小时`;
          if (seconds >= 60) return `每 ${seconds / 60} 分钟`;
          return `每 ${seconds} 秒`;
        }
        return '-';
      }
    },
    {
      title: '自动执行',
      dataIndex: 'autoRun',
      key: 'autoRun',
      render: (autoRun: boolean) => (
        <Tag color={autoRun ? 'success' : 'default'}>{autoRun ? '开启' : '关闭'}</Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Task) => (
        <Space>
          <Button
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleExecuteNow(record)}
          >
            执行
          </Button>
          <Button
            size="small"
            onClick={() => handleEditTask(record)}
          >
            编辑
          </Button>
          <Button
            size="small"
            onClick={() => handleToggleAutoRun(record)}
          >
            {record.autoRun ? '关闭自动' : '开启自动'}
          </Button>
          <Button
            size="small"
            danger
            onClick={() => handleDeleteTask(record.id!)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  // 执行记录表格列
  const executionColumns = [
    { title: '任务名称', dataIndex: 'taskName', key: 'taskName' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: TaskExecution) => {
        const colorMap: Record<string, string> = {
          PENDING: 'default',
          RUNNING: 'processing',
          COMPLETED: 'success',
          FAILED: 'error',
          CANCELLED: 'warning'
        };
        const textMap: Record<string, string> = {
          PENDING: '等待中',
          RUNNING: '运行中',
          COMPLETED: '已完成',
          FAILED: '失败',
          CANCELLED: '已取消'
        };
        const statusTag = <Tag color={colorMap[status]}>{textMap[status]}</Tag>;

        // 对于运行中的任务，显示进度条
        if (status === 'RUNNING' && record.progress > 0) {
          return (
            <div>
              {statusTag}
              <Progress
                percent={record.progress}
                size="small"
                status="active"
                style={{ marginTop: 4 }}
              />
            </div>
          );
        }

        return statusTag;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '执行结果',
      key: 'result',
      render: (_: any, record: TaskExecution) => {
        if (record.status === 'CANCELLED') {
          return <span style={{ color: '#faad14' }}>已取消</span>;
        }
        if (record.status === 'FAILED') {
          return <span style={{ color: '#ff4d4f' }}>失败: {record.error || '未知错误'}</span>;
        }
        if (record.status === 'COMPLETED') {
          if (record.result) {
            // 尝试解析并格式化结果
            try {
              const resultData = typeof record.result === 'string'
                ? JSON.parse(record.result)
                : record.result;
              if (resultData.data && typeof resultData.data === 'object') {
                const data = resultData.data;
                // 针对不同任务类型格式化显示结果
                if (data.message) {
                  return <span style={{ color: '#52c41a' }}>{data.message}</span>;
                }
                if (data.saved_stocks) {
                  return <span style={{ color: '#52c41a' }}>
                    同步完成: {data.saved_stocks} 只股票, {data.saved_klines || 0} 条记录
                  </span>;
                }
              }
              return <span style={{ color: '#52c41a' }}>成功</span>;
            } catch {
              return <span style={{ color: '#52c41a' }}>成功: {JSON.stringify(record.result)}</span>;
            }
          }
          return <span style={{ color: '#52c41a' }}>成功</span>;
        }
        // PENDING 或 RUNNING 状态，还没有执行结果
        return <span style={{ color: '#8c8c8c' }}>-</span>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: TaskExecution) => {
        return (
          <Space>
            {/* 查看日志按钮 */}
            <Button
              size="small"
              onClick={() => handleViewLogs(record)}
            >
              查看日志
            </Button>
            {/* 取消按钮 - 只对 PENDING 和 RUNNING 状态显示 */}
            {(record.status === 'PENDING' || record.status === 'RUNNING') && (
              <Button
                size="small"
                danger
                onClick={() => handleCancelExecution(record.id)}
              >
                取消
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 任务管理 */}
      <Card
        title="任务管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>
              刷新
            </Button>
            <Button type="primary" onClick={handleOpenCreateModal}>
              创建任务
            </Button>
          </Space>
        }
      >
        <Table
          columns={taskColumns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
        />
      </Card>

      {/* 执行记录 */}
      <Card
        title={<><HistoryOutlined /> 最近执行记录</>}
        style={{ marginTop: 16 }}
      >
        <Table
          columns={executionColumns}
          dataSource={executions}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      {/* 创建/编辑任务弹窗 */}
      <Modal
        title={editingTask ? '编辑任务' : '创建任务'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingTask(undefined);
        }}
        footer={null}
        destroyOnClose
      >
        <TaskForm onSubmit={handleCreateTask} loading={formSubmitting} task={editingTask} />
      </Modal>

      {/* 查看日志弹窗 */}
      <Modal
        title={
          <span>
            任务日志 - {currentExecution?.taskName || ''}
            {currentExecution?.status === 'RUNNING' && (
              <Tag color="processing" style={{ marginLeft: 8 }}>实时更新中</Tag>
            )}
          </span>
        }
        open={isLogModalOpen}
        onCancel={() => {
          setIsLogModalOpen(false);
          taskWebSocket.disconnect();
        }}
        width={800}
        footer={
          <Button onClick={() => {
            setIsLogModalOpen(false);
            taskWebSocket.disconnect();
          }}>关闭</Button>
        }
      >
        <Collapse
          defaultActiveKey={['1']}
          items={[
            {
              key: '1',
              label: `执行日志 (${logs.length} 条)`,
              children: (
                <div
                  style={{
                    maxHeight: 400,
                    overflow: 'auto',
                    backgroundColor: '#1e1e1e',
                    padding: 12,
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: 12
                  }}
                >
                  {logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
                      {currentExecution?.status === 'RUNNING' ? '等待日志...' : '暂无日志'}
                    </div>
                  ) : (
                    <>
                      {logs.map((logLine: string, idx: number) => {
                      // 解析日志格式: [timestamp] [level] message
                      const levelMatch = logLine.match(/\[(.+?)\]\s+\[(.+?)\]\s+(.+)/);
                      let time = '';
                      let level = 'INFO';
                      let message = logLine;

                      if (levelMatch) {
                        time = levelMatch[1];
                        level = levelMatch[2];
                        message = levelMatch[3];
                      }

                      const levelColors: Record<string, string> = {
                        INFO: '#52c41a',
                        WARNING: '#faad14',
                        ERROR: '#ff4d4f',
                        DEBUG: '#8c8c8c'
                      };
                      const levelColor = levelColors[level] || '#8c8c8c';

                      // 格式化时间显示
                      const displayTime = time
                        ? new Date(time).toLocaleTimeString('zh-CN')
                        : '';

                      return (
                        <div
                          key={idx}
                          style={{
                            marginBottom: 4,
                            color: levelColor,
                            wordBreak: 'break-all'
                          }}
                        >
                          <span style={{ color: '#8c8c8c' }}>[{displayTime}]</span>{' '}
                          <span style={{ color: levelColor, fontWeight: 'bold' }}>[{level}]</span>{' '}
                          <span>{message}</span>
                        </div>
                      );
                    })}
                    {/* 滚动锚点 */}
                    <div ref={logEndRef} />
                    </>
                  )}
                </div>
              )
            }
          ]}
        />
      </Modal>
    </div>
  );
};

export default Tasks;
