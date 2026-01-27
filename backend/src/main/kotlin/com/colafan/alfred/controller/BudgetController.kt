package com.colafan.alfred.controller

import com.colafan.alfred.dto.request.BudgetRequest
import com.colafan.alfred.dto.response.BudgetResponse
import com.colafan.alfred.dto.response.BudgetUsageResponse
import com.colafan.alfred.entity.Budget
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.BudgetService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal

@RestController
@RequestMapping("/api/v1/budgets")
class BudgetController(
    private val budgetService: BudgetService,
    private val authService: AuthService
) {

    @GetMapping
    fun getBudgets(
        @RequestParam(required = false) period: String?,
        @RequestParam(required = false) categoryId: Long?,
        authentication: Authentication
    ): ResponseEntity<List<BudgetResponse>> {
        val userId = authService.getCurrentUserId(authentication)

        // 根据查询参数过滤预算
        val budgets = budgetService.getBudgetsByUserId(userId).let { baseList ->
            var filtered = baseList

            // 按周期过滤
            if (period != null) {
                filtered = filtered.filter { it.period == period }
            }

            // 按分类过滤
            if (categoryId != null) {
                filtered = filtered.filter { it.categoryId == categoryId }
            }

            filtered
        }

        // RESTful: 直接返回数组
        return ResponseEntity.ok()
            .header("X-Total-Count", budgets.size.toString())
            .body(budgets.map { BudgetResponse.fromEntity(it) })
    }

    @GetMapping("/{id}")
    fun getBudget(
        @PathVariable id: Long,
        authentication: Authentication
    ): ResponseEntity<BudgetResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val budget = budgetService.getBudgetById(userId, id)

        return ResponseEntity.ok(BudgetResponse.fromEntity(budget))
    }

    @PostMapping
    fun createBudget(
        @Valid @RequestBody request: BudgetRequest,
        authentication: Authentication
    ): ResponseEntity<BudgetResponse> {
        val userId = authService.getCurrentUserId(authentication)

        val budget = Budget(
            userId = userId,
            categoryId = request.categoryId,
            amount = BigDecimal.valueOf(request.amount),
            period = request.period,
            alertThreshold = request.alertThreshold,
            startDate = request.startDate,
            endDate = request.endDate
        )

        val createdBudget = budgetService.createBudget(userId, budget)

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(BudgetResponse.fromEntity(createdBudget))
    }

    @PutMapping("/{id}")
    fun updateBudget(
        @PathVariable id: Long,
        @Valid @RequestBody request: BudgetRequest,
        authentication: Authentication
    ): ResponseEntity<BudgetResponse> {
        val userId = authService.getCurrentUserId(authentication)

        val budget = Budget(
            userId = userId,
            categoryId = request.categoryId,
            amount = BigDecimal.valueOf(request.amount),
            period = request.period,
            alertThreshold = request.alertThreshold,
            startDate = request.startDate,
            endDate = request.endDate
        )

        val updatedBudget = budgetService.updateBudget(userId, id, budget)

        return ResponseEntity.ok(BudgetResponse.fromEntity(updatedBudget))
    }

    @DeleteMapping("/{id}")
    fun deleteBudget(
        @PathVariable id: Long,
        authentication: Authentication
    ): ResponseEntity<Void> {
        val userId = authService.getCurrentUserId(authentication)
        budgetService.deleteBudget(userId, id)

        return ResponseEntity.noContent().build()
    }

    @GetMapping("/usage")
    fun getBudgetUsage(
        authentication: Authentication
    ): ResponseEntity<List<BudgetUsageResponse>> {
        val userId = authService.getCurrentUserId(authentication)
        val budgetUsage = budgetService.getBudgetUsage(userId)

        return ResponseEntity.ok(budgetUsage)
    }
}
