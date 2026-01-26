package com.colafan.alfred.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestTemplate

/**
 * RestTemplate 配置类
 */
@Configuration
class RestTemplateConfig {

    @Bean
    fun restTemplate(): RestTemplate {
        val factory = SimpleClientHttpRequestFactory()
        factory.setConnectTimeout(60000) // 60秒连接超时
        factory.setReadTimeout(120000)   // 120秒读取超时（LLM可能需要较长时间）
        return RestTemplate(factory)
    }
}
