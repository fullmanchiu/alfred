import { useState } from 'react';
import { Button, Card, Space, message } from 'antd';
import { api } from '@/services/api';

// 模拟的快捷问题
const quickQuestions = [
  { key: 'expense', label: '本周消费分析', icon: '💰' },
  { key: 'cycling', label: '最近骑行记录', icon: '🚴' },
  { key: 'health', label: '我的健康概览', icon: '❤️' },
];

const AIChat = () => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: '你好！我是 Alfred，你的智能生活助手。我可以帮你：\n\n• 分析消费和记账\n• 查看骑行和健康数据\n• 记录日常活动\n• 回答你的问题\n\n试试问我："帮我分析下本周的消费"',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setLoading(true);

    // 添加用户消息和空的助手消息
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' }
    ]);

    try {
      // 调用后端 AI 接口
      api.chatWithAI(
        userMessage,
        (chunk: string) => {
          // 流式接收并更新最后一条消息
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              newMessages[lastIndex] = {
                role: 'assistant',
                content: newMessages[lastIndex].content + chunk
              };
            }
            return newMessages;
          });
        },
        (error: string) => {
          message.error(`AI对话失败: ${error}`);
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              newMessages[lastIndex] = {
                role: 'assistant',
                content: '抱歉，对话出现问题，请稍后再试。'
              };
            }
            return newMessages;
          });
          setLoading(false);
        },
        () => {
          // 对话完成
          setLoading(false);
        }
      );
    } catch (error) {
      message.error('启动AI对话失败');
      setLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    // 快捷问题只是填充到输入框，让用户可以编辑
    setInputValue(question);
    // 自动聚焦到输入框
    const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
    inputElement?.focus();
  };

  return (
    <div
      style={{
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* 欢迎区域 */}
      {messages.length === 1 && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>Alfred</h1>
          <p style={{ fontSize: 16, color: '#666' }}>你的智能生活助手</p>
        </div>
      )}

      {/* 快捷问题按钮 */}
      {messages.length === 1 && (
        <div style={{ marginBottom: 24 }}>
          <Space wrap>
            {quickQuestions.map((q) => (
              <Button
                key={q.key}
                size="large"
                onClick={() => handleQuickQuestion(q.label)}
                style={{ borderRadius: 20 }}
              >
                <span style={{ marginRight: 8 }}>{q.icon}</span>
                {q.label}
              </Button>
            ))}
          </Space>
        </div>
      )}

      {/* 聊天区域 */}
      <Card
        style={{
          flex: 1,
          overflowY: 'auto',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
        styles={{
          body: {
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: 12,
                background: msg.role === 'user' ? '#1677ff' : '#f5f5f5',
                color: msg.role === 'user' ? '#fff' : '#000',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: '#f5f5f5',
              }}
            >
              正在思考...
            </div>
          </div>
        )}
      </Card>

      {/* 输入区域 */}
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="问我任何问题，比如：帮我分析本周消费..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 24,
            border: '1px solid #d9d9d9',
            fontSize: 14,
            outline: 'none',
            transition: 'all 0.3s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#1677ff';
            e.target.style.boxShadow = '0 0 0 2px rgba(22, 119, 255, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d9d9d9';
            e.target.style.boxShadow = 'none';
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !inputValue.trim()}
          style={{
            padding: '12px 24px',
            borderRadius: 24,
            background: '#1677ff',
            color: '#fff',
            border: 'none',
            cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !inputValue.trim() ? 0.5 : 1,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default AIChat;
