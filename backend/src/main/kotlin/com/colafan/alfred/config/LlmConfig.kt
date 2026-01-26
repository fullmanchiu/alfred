package com.colafan.alfred.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.bind.DefaultValue
import org.springframework.stereotype.Component

/**
 * LLM配置属性类
 */
@Component
@ConfigurationProperties(prefix = "llm")
data class LlmConfig(
    var provider: String = "custom",
    var openai: OpenAIConfig = OpenAIConfig(),
    var anthropic: AnthropicConfig = AnthropicConfig(),
    var custom: CustomConfig = CustomConfig()
) {
    data class OpenAIConfig(
        var apiKey: String = "",
        var model: String = "gpt-4",
        var baseUrl: String = "https://api.openai.com/v1"
    )

    data class AnthropicConfig(
        var apiKey: String = "",
        var model: String = "claude-3-5-sonnet-20241022"
    )

    data class CustomConfig(
        var apiKey: String = "",
        var baseUrl: String = "",
        var model: String = "gpt-4",
        var timeout: Int = 120,
        var maxTokens: Int = 3500,
        var temperature: Double = 0.7
    )
}
