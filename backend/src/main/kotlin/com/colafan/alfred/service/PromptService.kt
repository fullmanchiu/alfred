package com.colafan.alfred.service

import org.slf4j.LoggerFactory
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Service
import java.nio.charset.StandardCharsets

/**
 * 提示词服务
 * 负责加载默认提示词文件
 * 后续扩展：支持用户自定义提示词的增删改查
 */
@Service
class PromptService {

    companion object {
        private val logger = LoggerFactory.getLogger(PromptService::class.java)
    }

    /**
     * 加载股票分析系统提示词
     */
    fun loadStockSystemPrompt(): String {
        return loadPrompt("prompts/stock/system_prompt.txt")
    }

    /**
     * 加载股票分析用户提示词模板
     */
    fun loadStockUserPrompt(): String {
        return loadPrompt("prompts/stock/user_prompt.txt")
    }

    /**
     * 加载短期交易分析提示词模板
     */
    fun loadStockShortTermPrompt(): String {
        return loadPrompt("prompts/stock/short_term_prompt.txt")
    }

    /**
     * 从 classpath 加载提示词文件
     */
    private fun loadPrompt(path: String): String {
        return try {
            val resource = ClassPathResource(path)
            if (resource.exists()) {
                String(resource.inputStream.readAllBytes(), StandardCharsets.UTF_8)
            } else {
                logger.warn("提示词文件不存在: $path，使用空字符串")
                ""
            }
        } catch (e: Exception) {
            logger.error("加载提示词文件失败: $path", e)
            ""
        }
    }

    /**
     * 替换提示词模板中的占位符
     * @param template 提示词模板
     * @param placeholders 占位符映射，例如 mapOf("{code}" to "000001", "{data_content}" to "...")
     * @return 替换后的提示词
     */
    fun replacePlaceholders(template: String, placeholders: Map<String, String>): String {
        var result = template
        placeholders.forEach { (key, value) ->
            result = result.replace(key, value)
        }
        return result
    }
}
