package com.colafan.alfred.controller

import com.colafan.alfred.websocket.MessageHandler
import com.colafan.alfred.websocket.UnifiedWebSocketHandler
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.net.HttpURLConnection
import java.net.URL

/**
 * 系统健康检查控制器
 *
 * 端点说明：
 * - GET /api/v1/system/health - 获取所有服务健康状态
 * - GET /api/v1/system/websocket-status - 获取 WebSocket 连接状态
 */
@RestController
@RequestMapping("/api/v1/system")
class SystemHealthController(
    private val messageHandler: MessageHandler,
    private val unifiedWebSocketHandler: UnifiedWebSocketHandler
) {

    data class ServiceStatus(
        val name: String,
        val status: String,
        val url: String,
        val message: String? = null
    )

    /**
     * 获取所有服务的健康状态
     * GET /api/v1/system/health
     */
    @GetMapping("/health")
    fun getSystemHealth(): ResponseEntity<Map<String, Any>> {
        val services = mutableListOf<ServiceStatus>()

        // 检查后端状态（自己）
        services.add(ServiceStatus(
            name = "backend",
            status = "healthy",
            url = "https://colafans.cn/api/v1"
        ))

        // 检查 Python 微服务状态（通过内网访问）
        val pyServiceStatus = checkService("http://10.7.30.98:8001/", "py-service", "https://colafans.cn/py-api")
        services.add(pyServiceStatus)

        // 判断整体状态
        val overallStatus = if (services.all { it.status == "healthy" }) "healthy" else "degraded"

        return ResponseEntity.ok(mapOf(
            "status" to overallStatus,
            "timestamp" to System.currentTimeMillis(),
            "services" to services
        ))
    }

    /**
     * 检查单个服务状态
     * @param checkUrl 用于健康检查的内部地址
     * @param serviceName 服务名称
     * @param displayUrl 展示给用户的外部地址
     */
    private fun checkService(checkUrl: String, serviceName: String, displayUrl: String): ServiceStatus {
        return try {
            val connection = URL(checkUrl).openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 3000
            connection.readTimeout = 3000

            val responseCode = connection.responseCode
            if (responseCode in 200..399) {
                ServiceStatus(
                    name = serviceName,
                    status = "healthy",
                    url = displayUrl
                )
            } else {
                ServiceStatus(
                    name = serviceName,
                    status = "unhealthy",
                    url = displayUrl,
                    message = "HTTP $responseCode"
                )
            }
        } catch (e: Exception) {
            ServiceStatus(
                name = serviceName,
                status = "unhealthy",
                url = displayUrl,
                message = e.message
            )
        }
    }

    /**
     * 获取 WebSocket 连接状态
     * GET /api/v1/system/websocket-status
     */
    @GetMapping("/websocket-status")
    fun getWebSocketStatus(): ResponseEntity<Map<String, Any>> {
        val pythonConnected = messageHandler.isConnected()
        val connectedClients = unifiedWebSocketHandler.getConnectedClientTypes()

        return ResponseEntity.ok(mapOf(
            "python" to mapOf(
                "connected" to pythonConnected,
                "status" to if (pythonConnected) "connected" else "disconnected"
            ),
            "connectedClients" to connectedClients.toList(),
            "timestamp" to System.currentTimeMillis()
        ))
    }
}
