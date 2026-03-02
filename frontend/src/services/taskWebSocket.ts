/**
 * 任务日志 WebSocket 服务
 * 按需连接：仅在需要时连接，不需要时断开
 */

type LogMessage = {
  type: string;
  executionId: string;
  timestamp: string;
  level: string;
  message: string;
};

type MessageHandler = (data: LogMessage) => void;

class TaskWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandler: MessageHandler | null = null;

  constructor() {
    // 直接连接到Java后端WebSocket (绕过Vite代理)
    this.url = 'ws://localhost:8080/api/ws';
  }

  /**
   * 连接 WebSocket
   */
  connect(_executionId: string, onMessage: MessageHandler): Promise<void> {
    return new Promise((resolve, reject) => {
      // 先关闭任何现有连接
      this.disconnect();

      this.messageHandler = onMessage;

      // 设置连接超时
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        console.log('🔗 正在连接 WebSocket:', this.url);
        this.ws = new WebSocket(this.url);

        // 设置连接超时
        timeoutId = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('WebSocket 连接超时'));
          }
        }, 5000);

        this.ws.onopen = () => {
          if (timeoutId) clearTimeout(timeoutId);
          console.log('任务日志 WebSocket 已连接');

          // 发送握手消息
          if (this.ws) {
            const handshake = {
              type: 'handshake',
              payload: {
                clientType: 'frontend'
              },
              timestamp: Date.now()
            };
            this.ws.send(JSON.stringify(handshake));
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // 处理握手确认
            if (data.type === 'handshakeAck') {
              console.log('握手成功:', data.payload);
              return;
            }

            // 处理任务日志
            if (data.type === 'task_log' && this.messageHandler) {
              console.debug('收到任务日志:', data);
              this.messageHandler(data);
            }
          } catch (error) {
            console.error('解析 WebSocket 消息失败:', error);
          }
        };

        this.ws.onerror = (error) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('WebSocket 错误:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          if (timeoutId) clearTimeout(timeoutId);
          console.log('任务日志 WebSocket 已关闭');
          this.ws = null;
          this.messageHandler = null;
        };
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        console.error('创建 WebSocket 连接失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandler = null;
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 导出单例
export const taskWebSocket = new TaskWebSocketService();
