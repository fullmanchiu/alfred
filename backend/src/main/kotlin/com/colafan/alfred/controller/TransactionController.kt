package com.colafan.alfred.controller

import com.colafan.alfred.dto.request.TransactionRequest
import com.colafan.alfred.dto.response.TransactionResponse
import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.TransactionService
import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.time.LocalDateTime

@RestController
@RequestMapping("/api/v1/transactions")
class TransactionController(
    private val transactionService: TransactionService,
    private val authService: AuthService
) {

    @GetMapping
    fun getTransactions(
        @RequestParam(required = false) type: String?,
        @RequestParam(required = false) categoryId: Long?,
        @RequestParam(required = false) startDate: LocalDateTime?,
        @RequestParam(required = false) endDate: LocalDateTime?,
        @RequestParam(required = false) minAmount: Double?,
        @RequestParam(required = false) maxAmount: Double?,
        authentication: Authentication
    ): ResponseEntity<List<TransactionResponse>> {
        val userId = authService.getCurrentUserId(authentication)

        // 根据查询参数过滤交易
        val transactions = transactionService.getTransactionsByUserId(userId).let { baseList ->
            var filtered = baseList

            // 按类型过滤
            if (type != null) {
                filtered = filtered.filter { it.type == type }
            }

            // 按分类过滤
            if (categoryId != null) {
                filtered = filtered.filter { it.categoryId == categoryId }
            }

            // 按日期范围过滤
            if (startDate != null) {
                filtered = filtered.filter { it.transactionDate.isAfter(startDate) || it.transactionDate.isEqual(startDate) }
            }
            if (endDate != null) {
                filtered = filtered.filter { it.transactionDate.isBefore(endDate) || it.transactionDate.isEqual(endDate) }
            }

            // 按金额范围过滤
            if (minAmount != null) {
                filtered = filtered.filter { it.amount.toDouble() >= minAmount }
            }
            if (maxAmount != null) {
                filtered = filtered.filter { it.amount.toDouble() <= maxAmount }
            }

            filtered
        }

        // RESTful: 直接返回数组，通过HTTP header传递分页信息
        return ResponseEntity.ok()
            .header("X-Total-Count", transactions.size.toString())
            .body(transactions.map { TransactionResponse.fromEntity(it) })
    }

    @GetMapping("/{id}")
    fun getTransaction(
        @PathVariable id: Long,
        authentication: Authentication
    ): ResponseEntity<TransactionResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val transaction = transactionService.getTransactionById(userId, id)

        return ResponseEntity.ok(TransactionResponse.fromEntity(transaction))
    }

    @PostMapping
    fun createTransaction(
        @Valid @RequestBody request: TransactionRequest,
        authentication: Authentication
    ): ResponseEntity<TransactionResponse> {
        val userId = authService.getCurrentUserId(authentication)

        val transaction = Transaction(
            userId = userId,
            type = request.type,
            amount = BigDecimal.valueOf(request.amount),
            fromAccountId = request.fromAccountId,
            toAccountId = request.toAccountId,
            categoryId = request.categoryId,
            transactionDate = request.transactionDate,
            notes = request.notes,
            location = request.location,
            tags = request.tags,
            imageCount = request.imageCount
        )

        val createdTransaction = transactionService.createTransaction(userId, transaction)

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(TransactionResponse.fromEntity(createdTransaction))
    }

    @PutMapping("/{id}")
    fun updateTransaction(
        @PathVariable id: Long,
        @Valid @RequestBody request: TransactionRequest,
        authentication: Authentication
    ): ResponseEntity<TransactionResponse> {
        val userId = authService.getCurrentUserId(authentication)

        val transaction = Transaction(
            userId = userId,
            type = request.type,
            amount = BigDecimal.valueOf(request.amount),
            fromAccountId = request.fromAccountId,
            toAccountId = request.toAccountId,
            categoryId = request.categoryId,
            transactionDate = request.transactionDate,
            notes = request.notes,
            location = request.location,
            tags = request.tags,
            imageCount = request.imageCount
        )

        val updatedTransaction = transactionService.updateTransaction(userId, id, transaction)

        return ResponseEntity.ok(TransactionResponse.fromEntity(updatedTransaction))
    }

    @DeleteMapping("/{id}")
    fun deleteTransaction(
        @PathVariable id: Long,
        authentication: Authentication
    ): ResponseEntity<Void> {
        val userId = authService.getCurrentUserId(authentication)
        transactionService.deleteTransaction(userId, id)

        return ResponseEntity.noContent().build()
    }
}
