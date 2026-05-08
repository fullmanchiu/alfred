package com.colafan.alfred.config

import com.alibaba.cloud.ai.graph.agent.ReactAgent
import com.alibaba.cloud.ai.graph.agent.hook.skills.SkillsAgentHook
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver
import com.alibaba.cloud.ai.graph.skills.registry.SkillRegistry
import com.alibaba.cloud.ai.graph.skills.registry.classpath.ClasspathSkillRegistry
import com.colafan.alfred.service.ai.StockAnalysisTools
import org.slf4j.LoggerFactory
import org.springframework.ai.chat.model.ChatModel
import org.springframework.ai.tool.method.MethodToolCallbackProvider
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.nio.file.Files
import java.nio.file.Path

@Configuration
class SkillsConfig {

    private val logger = LoggerFactory.getLogger(SkillsConfig::class.java)

    @Bean
    fun memorySaver(): MemorySaver {
        return MemorySaver()
    }

    @Bean
    fun skillRegistry(): SkillRegistry {
        // Try filesystem first, fallback to classpath
        val skillsPath = Path.of("skills").toAbsolutePath()
        if (Files.exists(skillsPath)) {
            logger.info("Skills directory found: {}, loading from filesystem", skillsPath)
            Files.list(skillsPath).forEach { p ->
                logger.info("  Found skill directory: {}", p.fileName)
            }
        } else {
            logger.info("Skills directory not found at: {}, falling back to classpath", skillsPath)
        }

        return ClasspathSkillRegistry.builder()
            .classpathPath("skills")
            .build()
    }

    @Bean
    fun skillsAgentHook(registry: SkillRegistry): SkillsAgentHook {
        return SkillsAgentHook.builder()
            .skillRegistry(registry)
            .build()
    }

    @Bean
    fun reactAgent(
        chatModel: ChatModel,
        skillsAgentHook: SkillsAgentHook,
        memorySaver: MemorySaver,
        stockAnalysisTools: StockAnalysisTools
    ): ReactAgent {
        val toolProvider = MethodToolCallbackProvider.builder()
            .toolObjects(stockAnalysisTools)
            .build()

        return ReactAgent.builder()
            .name("alfred-agent")
            .model(chatModel)
            .hooks(skillsAgentHook)
            .saver(memorySaver)
            .tools(*toolProvider.getToolCallbacks())
            .enableLogging(true)
            .build()
    }
}
