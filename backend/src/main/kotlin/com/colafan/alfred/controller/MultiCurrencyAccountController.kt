package com.colafan.alfred.controller

import com.colafan.alfred.dto.request.AddCurrencyRequest
import com.colafan.alfred.dto.request.CreateAccountGroupRequest
import com.colafan.alfred.dto.request.CreateInstitutionRequest
import com.colafan.alfred.dto.response.AccountGroupResponse
import com.colafan.alfred.dto.response.AccountsListResponse
import com.colafan.alfred.dto.response.InstitutionResponse
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.MultiCurrencyAccountService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

/**
 * 多货币账户控制器
 */
@RestController
@RequestMapping("/api/v1/multi-currency-accounts")
class MultiCurrencyAccountController(
    private val multiCurrencyAccountService: MultiCurrencyAccountService,
    private val authService: AuthService
) {

    /**
     * 创建金融机构
     */
    @PostMapping("/institutions")
    fun createInstitution(
        @Valid @RequestBody request: CreateInstitutionRequest,
        authentication: Authentication
    ): ResponseEntity<InstitutionResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val institution = multiCurrencyAccountService.createInstitution(userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(institution)
    }

    /**
     * 获取用户所有账户（支持按货币筛选）
     */
    @GetMapping
    fun getAccounts(
        @RequestParam(required = false) currency: String?,
        authentication: Authentication
    ): ResponseEntity<AccountsListResponse> {
        val userId = authService.getCurrentUserId(authentication)

        return if (currency != null) {
            // 按货币筛选
            val accounts = multiCurrencyAccountService.getAccountsByCurrency(userId, currency)
            val totalBalance = mapOf(currency to accounts.sumOf {
                it.currencies.find { c -> c.currency == currency }?.balance ?: 0.0
            })

            ResponseEntity.ok(
                AccountsListResponse(
                    accounts = accounts,
                    totalBalanceByCurrency = totalBalance,
                    institutions = emptyList()
                )
            )
        } else {
            // 获取所有账户
            ResponseEntity.ok(multiCurrencyAccountService.getUserAccounts(userId))
        }
    }

    /**
     * 获取单个账户组详情
     */
    @GetMapping("/account-groups/{id}")
    fun getAccountGroup(
        @PathVariable id: Long,
        authentication: Authentication
    ): ResponseEntity<AccountGroupResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val accountGroup = multiCurrencyAccountService.getAccountGroupById(userId, id)
        return ResponseEntity.ok(accountGroup)
    }

    /**
     * 创建账户组（含多个货币账户）
     */
    @PostMapping("/account-groups")
    fun createAccountGroup(
        @Valid @RequestBody request: CreateAccountGroupRequest,
        authentication: Authentication
    ): ResponseEntity<AccountGroupResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val accountGroup = multiCurrencyAccountService.createAccountGroup(userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(accountGroup)
    }

    /**
     * 为账户组添加新货币
     */
    @PostMapping("/account-groups/{id}/currencies")
    fun addCurrency(
        @PathVariable id: Long,
        @Valid @RequestBody request: AddCurrencyRequest,
        authentication: Authentication
    ): ResponseEntity<AccountGroupResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val accountGroup = multiCurrencyAccountService.addCurrencyToAccount(userId, id, request)
        return ResponseEntity.ok(accountGroup)
    }
}
