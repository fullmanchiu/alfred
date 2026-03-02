package com.colafan.alfred.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestTemplate

/**
 * Python 微服务配置
 * Spring Boot 支持松散绑定，会自动映射 base-url → baseUrl
 */
@Configuration
@ConfigurationProperties(prefix = "python-service")
class PythonServiceConfig {

    /**
     * Python 服务地址
     */
    var baseUrl: String = "http://localhost:8001"

    /**
     * 连接超时（毫秒）
     */
    var connectTimeout: Int = 5000

    /**
     * 读取超时（毫秒）
     */
    var readTimeout: Int = 60000

    /**
     * 是否启用
     */
    var enabled: Boolean = true

    @Bean("pythonRestTemplate")
    fun pythonRestTemplate(): RestTemplate {
        val factory = SimpleClientHttpRequestFactory()
        factory.setConnectTimeout(connectTimeout)
        factory.setReadTimeout(readTimeout)
        return RestTemplate(factory)
    }
}
