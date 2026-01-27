package com.colafan.alfred.controller

import com.colafan.alfred.dto.request.FinancialReportRequest
import com.colafan.alfred.dto.request.SpendingAnalysisRequest
import com.colafan.alfred.service.AccountService
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.LlmService
import com.colafan.alfred.service.TransactionService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import org.slf4j.LoggerFactory
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

/**
 * LLM分析控制器
 * 提供AI建议和分析功能
 */
@RestController
@RequestMapping("/api/v1/llm")
@Tag(name = "AI分析", description = "AI智能分析接口")
class LlmController(
    private val llmService: LlmService,
    private val authService: AuthService,
    private val transactionService: TransactionService,
    private val accountService: AccountService
) {
    companion object {
        private val logger = LoggerFactory.getLogger(LlmController::class.java)
    }

    @GetMapping("/budget/advice")
    @Operation(summary = "获取预算建议", description = "基于预算使用情况生成AI建议")
    fun getBudgetAdvice(
        @RequestParam(defaultValue = "monthly") period: String,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = authService.getCurrentUserId(authentication)

        return try {
            val advice = llmService.analyzeBudget(userId, period)
            mapOf(
                "success" to true,
                "data" to mapOf(
                    "advice" to advice,
                    "generatedAt" to LocalDateTime.now()
                )
            )
        } catch (e: Exception) {
            mapOf(
                "success" to false,
                "message" to "AI分析失败: ${e.message}"
            )
        }
    }

    @PostMapping("/spending/analyze")
    @Operation(summary = "分析消费行为", description = "基于交易记录分析消费模式")
    fun analyzeSpending(
        @RequestBody request: SpendingAnalysisRequest,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = authService.getCurrentUserId(authentication)

        return try {
            val analysis = llmService.analyzeSpending(
                request.transactions,
                request.budgetInfo
            )
            mapOf(
                "success" to true,
                "data" to mapOf(
                    "analysis" to analysis,
                    "generatedAt" to LocalDateTime.now()
                )
            )
        } catch (e: Exception) {
            mapOf(
                "success" to false,
                "message" to "AI分析失败: ${e.message}"
            )
        }
    }

    @PostMapping("/financial/report")
    @Operation(summary = "生成财务报告", description = "生成完整的财务健康报告")
    fun generateFinancialReport(
        @RequestBody request: FinancialReportRequest,
        authentication: Authentication
    ): Map<String, Any> {
        return try {
            val report = llmService.generateFinancialReport(
                request.income,
                request.expenses,
                request.savings,
                request.topCategories
            )
            mapOf(
                "success" to true,
                "data" to mapOf(
                    "report" to report,
                    "generatedAt" to LocalDateTime.now()
                )
            )
        } catch (e: Exception) {
            mapOf(
                "success" to false,
                "message" to "AI分析失败: ${e.message}"
            )
        }
    }

    @PostMapping("/spending/analyze-stream")
    @Operation(summary = "流式分析消费行为", description = "基于交易记录实时流式分析消费模式")
    fun analyzeSpendingStream(
        @RequestBody request: SpendingAnalysisRequest,
        authentication: Authentication
    ): SseEmitter {
        // 创建 SSE Emitter，设置超时时间为 3 分钟
        val emitter = SseEmitter(180000L)

        // 设置完成和错误回调
        emitter.onTimeout {
            logger.warn("SSE 连接超时")
            emitter.complete()
        }

        emitter.onError { e ->
            logger.error("SSE 连接错误", e)
            emitter.completeWithError(e)
        }

        // 异步执行流式分析
        llmService.analyzeSpendingStream(
            request.transactions,
            request.budgetInfo,
            emitter
        )

        return emitter
    }

    @PostMapping("/chat")
    @Operation(summary = "智能对话", description = "AI智能助理对话接口，自动识别用户意图并提供帮助")
    fun chat(
        @RequestBody request: ChatRequest,
        authentication: Authentication
    ): SseEmitter {
        val userId = authService.getCurrentUserId(authentication)

        // 创建 SSE Emitter
        val emitter = SseEmitter(180000L)

        emitter.onTimeout {
            logger.warn("Chat SSE 连接超时")
            emitter.complete()
        }

        emitter.onError { e ->
            logger.error("Chat SSE 连接错误", e)
            emitter.completeWithError(e)
        }

        // 异步执行智能对话
        llmService.chat(request.message, userId, emitter)

        return emitter
    }

    /**
     * 聊天请求
     */
    data class ChatRequest(
        val message: String
    )
}
