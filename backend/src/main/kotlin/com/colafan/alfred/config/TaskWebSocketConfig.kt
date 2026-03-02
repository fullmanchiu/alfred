package com.colafan.alfred.config

import com.colafan.alfred.websocket.UnifiedWebSocketHandler
import org.springframework.context.annotation.Configuration
import org.springframework.web.socket.config.annotation.EnableWebSocket
import org.springframework.web.socket.config.annotation.WebSocketConfigurer
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry

/**
 * WebSocket 配置
 *
 * 端点说明：
 * - /api/ws: 统一 WebSocket 端点（Python、前端等）
 */
@Configuration
@EnableWebSocket
class TaskWebSocketConfig(
    private val unifiedWebSocketHandler: UnifiedWebSocketHandler
) : WebSocketConfigurer {

    override fun registerWebSocketHandlers(registry: WebSocketHandlerRegistry) {
        // 统一 WebSocket 端点（Python、前端等）
        registry
            .addHandler(unifiedWebSocketHandler, "/api/ws")
            .setAllowedOrigins("*")
    }
}
