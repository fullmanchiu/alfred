package com.colafan.alfred.controller

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
 */
@RestController
@RequestMapping("/api/v1/system")
class SystemHealthController {

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
            url = "http://localhost:8080/actuator/health"
        ))

        // 检查 Python 微服务状态
        val pyServiceStatus = checkService("http://localhost:8001/", "py-service")
        services.add(pyServiceStatus)

        // 检查前端状态
        val frontendStatus = checkService("http://localhost:3000/", "frontend")
        services.add(frontendStatus)

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
     */
    private fun checkService(serviceUrl: String, serviceName: String): ServiceStatus {
        return try {
            val connection = URL(serviceUrl).openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 3000
            connection.readTimeout = 3000

            val responseCode = connection.responseCode
            if (responseCode in 200..399) {
                ServiceStatus(
                    name = serviceName,
                    status = "healthy",
                    url = serviceUrl
                )
            } else {
                ServiceStatus(
                    name = serviceName,
                    status = "unhealthy",
                    url = serviceUrl,
                    message = "HTTP $responseCode"
                )
            }
        } catch (e: Exception) {
            ServiceStatus(
                name = serviceName,
                status = "unhealthy",
                url = serviceUrl,
                message = e.message
            )
        }
    }
}
