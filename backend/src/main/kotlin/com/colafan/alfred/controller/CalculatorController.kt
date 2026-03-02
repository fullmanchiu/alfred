package com.colafan.alfred.controller

import com.colafan.alfred.websocket.MessageHandler
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.concurrent.TimeUnit

/**
 * 计算器控制器
 * 用于测试 WebSocket 通讯链路：前端 → Java → WebSocket → Python
 */
@RestController
@RequestMapping("/api/calculator")
class CalculatorController(
    private val messageHandler: MessageHandler
) {

    /**
     * 加法计算
     * 通过 WebSocket 调用 Python 微服务
     */
    @PostMapping("/add")
    fun add(@RequestBody request: AddRequest): ResponseEntity<AddResponse> {
        try {
            // 通过 WebSocket 发送请求到 Python
            val response = messageHandler.sendRequest(
                action = "calculator.add",
                payload = mapOf(
                    "a" to request.a,
                    "b" to request.b
                )
            )

            if (response != null && response.payload["success"] == true) {
                val result = (response.payload["data"] as? Map<String, Any>)?.get("result") as? Number
                return ResponseEntity.ok(
                    AddResponse(
                        success = true,
                        result = result?.toInt() ?: 0,
                        message = "计算成功"
                    )
                )
            } else {
                return ResponseEntity.ok(
                    AddResponse(
                        success = false,
                        result = 0,
                        message = response?.payload?.get("message")?.toString() ?: "计算失败"
                    )
                )
            }
        } catch (e: Exception) {
            return ResponseEntity.ok(
                AddResponse(
                    success = false,
                    result = 0,
                    message = "WebSocket 通讯失败: ${e.message}"
                )
            )
        }
    }

    /**
     * 健康检查
     */
    @GetMapping("/health")
    fun health(): ResponseEntity<Map<String, Any>> {
        val isConnected = messageHandler.isConnected()
        return ResponseEntity.ok(
            mapOf(
                "status" to if (isConnected) "healthy" else "disconnected",
                "websocket" to mapOf(
                    "connected" to isConnected
                )
            )
        )
    }

    data class AddRequest(
        val a: Number,
        val b: Number
    )

    data class AddResponse(
        val success: Boolean,
        val result: Int,
        val message: String
    )
}
