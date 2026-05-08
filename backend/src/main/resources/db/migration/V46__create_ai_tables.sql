-- V46__create_ai_tables.sql
-- AI 对话和消息表

CREATE TABLE ai_conversations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    title VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,           -- 'user' / 'assistant'
    content TEXT,
    thinking TEXT,                        -- 推理/思考过程
    tool_calls JSONB,                     -- 工具调用记录
    a2ui JSONB,                           -- 动态组件数据
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id, updated_at DESC);
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);
