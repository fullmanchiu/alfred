package com.colafan.alfred.controller.ai

import com.colafan.alfred.dto.ai.AiChatRequest
import com.colafan.alfred.dto.ai.ConversationDto
import com.colafan.alfred.dto.ai.MessageDto
import com.colafan.alfred.dto.ai.MessageListResponse
import com.colafan.alfred.service.ai.AiChatService
import com.colafan.alfred.service.AuthService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@RestController
@RequestMapping("/api/v1/ai")
@Tag(name = "AI对话", description = "AI智能对话接口，支持流式输出和多轮对话")
class AiChatController(
    private val aiChatService: AiChatService,
    private val authService: AuthService
) {

    @PostMapping("/chat")
    @Operation(summary = "发送消息", description = "发送消息到AI，通过SSE流式返回响应")
    fun chat(
        @RequestBody request: AiChatRequest,
        authentication: Authentication
    ): SseEmitter {
        val userId = authService.getCurrentUserId(authentication)
        val emitter = SseEmitter(300000L) // 5分钟超时

        emitter.onTimeout {
            emitter.complete()
        }

        emitter.onError { e ->
            emitter.completeWithError(e)
        }

        aiChatService.chat(userId, request, emitter)

        return emitter
    }

    @PostMapping("/chat/{conversationId}/stop")
    @Operation(summary = "停止当前对话", description = "停止正在进行的AI响应")
    fun stopChat(
        @PathVariable conversationId: Long,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = authService.getCurrentUserId(authentication)
        aiChatService.stopChat(conversationId, userId)
        return mapOf("success" to true)
    }

    @GetMapping("/conversations")
    @Operation(summary = "获取对话列表", description = "获取当前用户的所有对话")
    fun getConversations(authentication: Authentication): List<ConversationDto> {
        val userId = authService.getCurrentUserId(authentication)
        return aiChatService.listConversations(userId)
    }

    @GetMapping("/conversations/{id}")
    @Operation(summary = "获取对话详情", description = "获取单个对话及其消息列表")
    fun getConversation(
        @PathVariable id: Long,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = authService.getCurrentUserId(authentication)
        val conversation = aiChatService.getConversation(id, userId)
        val messages = aiChatService.getMessages(id, userId)
        return mapOf(
            "conversation" to conversation,
            "messages" to messages
        )
    }

    @DeleteMapping("/conversations/{id}")
    @Operation(summary = "删除对话", description = "删除指定对话及其所有消息")
    fun deleteConversation(
        @PathVariable id: Long,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = authService.getCurrentUserId(authentication)
        aiChatService.deleteConversation(id, userId)
        return mapOf("success" to true)
    }

    @GetMapping("/conversations/{id}/messages")
    @Operation(summary = "获取消息列表", description = "获取指定对话的所有消息")
    fun getMessages(
        @PathVariable id: Long,
        authentication: Authentication
    ): MessageListResponse {
        val userId = authService.getCurrentUserId(authentication)
        return MessageListResponse(aiChatService.getMessages(id, userId))
    }
}
