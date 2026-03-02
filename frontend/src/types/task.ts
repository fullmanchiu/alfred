/**
 * 任务管理相关类型定义
 */

// 任务
export interface Task {
  id?: number;
  name: string;
  taskType: string;
  autoRun: boolean;
  scheduleRule?: string;
  params?: string;  // JSON 字符串
  createdAt?: string;
  updatedAt?: string;
}

// 任务执行记录
export interface TaskExecution {
  id: string;
  taskName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  retryCount: number;
  maxRetries: number;
  startedAt?: string;
  completedAt?: string;
  result?: Record<string, any>;
  error?: string;
  progress: number;  // 执行进度 0-100
  logFilePath?: string;  // 日志文件路径
  createdAt: string;
}

// 创建任务请求
export interface ScheduleTaskRequest {
  name: string;
  taskType: string;
  scheduleType?: string;  // "cron" or "interval" or null
  cronExpr?: string;
  intervalSeconds?: number;
  autoRun?: boolean;
  params?: string;  // JSON 字符串
}

// 立即执行任务请求
export interface ExecuteTaskNowRequest {
  taskName: string;
  taskType: string;
  params?: string | Record<string, any>;
}

// 任务列表响应
export interface TaskListResponse {
  success: boolean;
  tasks: Task[];
}

// 执行历史响应
export interface ExecutionListResponse {
  success: boolean;
  executions: TaskExecution[];
}
