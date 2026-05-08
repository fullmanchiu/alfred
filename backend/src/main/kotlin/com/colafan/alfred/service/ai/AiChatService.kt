package com.colafan.alfred.service.ai

import com.alibaba.cloud.ai.graph.RunnableConfig
import com.alibaba.cloud.ai.graph.agent.ReactAgent
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver
import com.colafan.alfred.dto.ai.AiChatRequest
import com.colafan.alfred.dto.ai.ConversationDto
import com.colafan.alfred.dto.ai.MessageDto
import com.colafan.alfred.entity.ai.AiConversation
import com.colafan.alfred.entity.ai.AiMessage
import com.colafan.alfred.repository.ai.AiConversationRepository
import com.colafan.alfred.repository.ai.AiMessageRepository
import org.slf4j.LoggerFactory
import org.springframework.ai.chat.messages.AssistantMessage
import org.springframework.ai.chat.messages.Message
import org.springframework.ai.chat.messages.UserMessage
import org.springframework.stereotype.Service
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@Service
class AiChatService(
    private val aiConversationRepository: AiConversationRepository,
    private val aiMessageRepository: AiMessageRepository,
    private val reactAgent: ReactAgent,
    private val memorySaver: MemorySaver,
    transactionManager: PlatformTransactionManager
) {
    private val logger = LoggerFactory.getLogger(AiChatService::class.java)
    private val txTemplate = TransactionTemplate(transactionManager)

    // Track active emitters for stop support
    private val activeEmitters = mutableMapOf<Long, SseEmitter>()

    fun chat(userId: Long, request: AiChatRequest, emitter: SseEmitter) {
        Thread {
            var conversationId: Long? = null
            try {
                // 1. Get or create conversation
                val conversation = getOrCreateConversation(userId, request)
                conversationId = conversation.id!!

                // 2. Save user message
                saveUserMessage(conversationId, request.content)

                // 3. Register emitter for stop support
                activeEmitters[conversationId] = emitter

                // 4. Call agent and stream response
                callAgentAndStream(conversationId, request.content, emitter)

            } catch (e: Exception) {
                logger.error("AI对话失败, conversationId=$conversationId", e)
                try {
                    emitter.send(SseEmitter.event().name("error").data("对话失败: ${e.message}"))
                    emitter.completeWithError(e)
                } catch (_: Exception) { }
            } finally {
                conversationId?.let { activeEmitters.remove(it) }
            }
        }.start()
    }

    @Transactional
    private fun getOrCreateConversation(userId: Long, request: AiChatRequest): AiConversation {
        return if (request.conversationId != null) {
            aiConversationRepository.findByIdAndUserId(request.conversationId, userId)
                ?: throw IllegalArgumentException("对话不存在: ${request.conversationId}")
        } else {
            val title = request.title ?: request.content.take(50)
            val newConv = AiConversation(userId = userId, title = title)
            aiConversationRepository.save(newConv)
        }
    }

    @Transactional
    private fun saveUserMessage(conversationId: Long, content: String) {
        val conv = aiConversationRepository.findById(conversationId).orElse(null)
            ?: throw IllegalArgumentException("对话不存在: $conversationId")
        aiMessageRepository.save(AiMessage.user(conv, content))
        conv.preUpdate()
        aiConversationRepository.save(conv)
    }

    @Transactional
    private fun saveAssistantMessage(conversationId: Long, content: String, thinking: String?) {
        if (content.isBlank()) return
        val conv = aiConversationRepository.findById(conversationId).orElse(null) ?: return
        aiMessageRepository.save(AiMessage.assistant(conv, content, thinking))
        conv.preUpdate()
        aiConversationRepository.save(conv)
    }

    fun stopChat(conversationId: Long, userId: Long) {
        aiConversationRepository.findByIdAndUserId(conversationId, userId) ?: return
        activeEmitters[conversationId]?.let { emitter ->
            try { emitter.complete() } catch (_: Exception) { }
            activeEmitters.remove(conversationId)
        }
    }

    fun listConversations(userId: Long): List<ConversationDto> {
        return aiConversationRepository.findByUserIdOrderByUpdatedAtDesc(userId)
            .map { conv ->
                ConversationDto(
                    id = conv.id!!,
                    userId = conv.userId,
                    title = conv.title,
                    updatedAt = conv.updatedAt.toString()
                )
            }
    }

    fun getConversation(id: Long, userId: Long): ConversationDto {
        val conv = aiConversationRepository.findByIdAndUserId(id, userId)
            ?: throw IllegalArgumentException("对话不存在")
        return ConversationDto(
            id = conv.id!!,
            userId = conv.userId,
            title = conv.title,
            updatedAt = conv.updatedAt.toString()
        )
    }

    fun getMessages(conversationId: Long, userId: Long): List<MessageDto> {
        aiConversationRepository.findByIdAndUserId(conversationId, userId)
            ?: throw IllegalArgumentException("对话不存在")
        return aiMessageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
            .map { msg ->
                MessageDto(
                    id = msg.id!!,
                    role = msg.role,
                    content = msg.content,
                    thinking = msg.thinking,
                    toolCalls = msg.toolCalls,
                    a2ui = msg.a2ui,
                    createdAt = msg.createdAt.toString()
                )
            }
    }

    @Transactional
    fun deleteConversation(id: Long, userId: Long) {
        val conv = aiConversationRepository.findByIdAndUserId(id, userId)
            ?: throw IllegalArgumentException("对话不存在")
        activeEmitters.remove(id)?.let { try { it.complete() } catch (_: Exception) { } }
        aiConversationRepository.delete(conv)
    }

    // ============= Internal helpers =============

    private fun buildMessageHistory(conversationId: Long): List<Message> {
        return aiMessageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
            .mapNotNull { msg ->
                val content = msg.content ?: ""
                if (content.isBlank()) null
                else when (msg.role) {
                    "user" -> UserMessage(content)
                    "assistant" -> AssistantMessage(content)
                    else -> null
                }
            }
    }

    /**
     * Call the agent and stream the response back to the client.
     *
     * Uses CompiledGraph.stream() to observe each node execution,
     * extracting LLM output and tool calls in real-time.
     */
    private fun callAgentAndStream(
        conversationId: Long,
        userContent: String,
        emitter: SseEmitter
    ) {
        logger.info("开始 Agent stream: conversationId=$conversationId")

        val config = RunnableConfig.builder()
            .threadId("conv_$conversationId")
            .build()

        // Observe the agent graph execution node by node
        val compiledGraph = reactAgent.getAndCompileGraph()
        val stream = compiledGraph.stream(mapOf("input" to userContent), config)

        val fullContentBuilder = StringBuilder()
        val thinkingBuilder = StringBuilder()
        var lastEmittedContent = ""

        try {
            stream.toIterable().forEach { nodeOutput ->
                val nodeName = nodeOutput.node()
                val state = nodeOutput.state()

                logger.debug("Node: $nodeName, state keys: ${state.data().keys}")

                // Extract messages from state
                val messages = state.value("messages", List::class.java).orElse(emptyList<Any>())
                    .filterIsInstance<org.springframework.ai.chat.messages.Message>()

                // Find the latest assistant message
                messages.lastOrNull { it is AssistantMessage }?.let { msg ->
                    val assistantMsg = msg as AssistantMessage
                    val text = assistantMsg.text ?: ""
                    // Only emit new content since last emission
                    if (text.length > lastEmittedContent.length) {
                        val newContent = text.substring(lastEmittedContent.length)
                        try {
                            emitter.send(SseEmitter.event().name("content").data(newContent))
                        } catch (_: Exception) {
                            return@forEach
                        }
                        fullContentBuilder.append(newContent)
                        lastEmittedContent = text
                    }
                }

                // Check for tool calls in state
                val toolCalls = state.value("toolCalls", List::class.java).orElse(emptyList<Any>())
                toolCalls.forEach { toolCall ->
                    logger.debug("Tool call: $toolCall")
                    // TODO: emit tool_call / tool_result events
                }
            }
        } catch (e: Exception) {
            logger.error("Agent stream failed", e)
            try {
                emitter.send(SseEmitter.event().name("error").data("Agent执行失败: ${e.message}"))
            } catch (_: Exception) { }
        }

        val fullContent = fullContentBuilder.toString()
        val thinking = thinkingBuilder.toString().ifBlank { null }

        // Save assistant message
        saveAssistantMessage(conversationId, fullContent, thinking)

        // Send done event
        try {
            emitter.send(
                SseEmitter.event()
                    .name("done")
                    .data("""{"conversationId":$conversationId}""")
            )
            emitter.complete()
        } catch (e: Exception) {
            logger.warn("SSE complete failed: ${e.message}")
            try { emitter.complete() } catch (_: Exception) { }
        }
    }
}
