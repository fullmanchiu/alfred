package com.colafan.alfred.controller

import com.colafan.alfred.dto.request.AccountRequest
import com.colafan.alfred.dto.response.AccountResponse
import com.colafan.alfred.entity.Account
import com.colafan.alfred.service.AccountService
import com.colafan.alfred.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.math.BigDecimal as JavaBigDecimal

@RestController
@RequestMapping("/api/v1/accounts")
class AccountController(
    private val accountService: AccountService,
    private val authService: AuthService
) {

    data class AccountsListResponse(
        val accounts: List<AccountResponse>,
        val totalBalance: Double
    )

    @GetMapping
    fun getAccounts(
        @RequestParam(required = false) type: String?,
        authentication: Authentication
    ): ResponseEntity<AccountsListResponse> {
        val userId = authService.getCurrentUserId(authentication)

        val accounts = if (type != null) {
            accountService.getAccountsByUserId(userId).filter { it.accountType == type }
        } else {
            accountService.getAccountsByUserId(userId)
        }

        val totalBalance = accountService.getTotalBalance(userId)

        // RESTful: 账户列表需要返回total_balance，使用对象包装
        return ResponseEntity.ok(
            AccountsListResponse(
                accounts = accounts.map { AccountResponse.fromEntity(it) },
                totalBalance = totalBalance.toDouble()
            )
        )
    }

    @GetMapping("/{id}")
    fun getAccount(
        @PathVariable id: Long,
        authentication: Authentication
    ): ResponseEntity<AccountResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val account = accountService.getAccountById(userId, id)

        return ResponseEntity.ok(AccountResponse.fromEntity(account))
    }

    @PostMapping
    fun createAccount(
        @Valid @RequestBody request: AccountRequest,
        authentication: Authentication
    ): ResponseEntity<AccountResponse> {
        val userId = authService.getCurrentUserId(authentication)

        val account = Account(
            userId = userId,
            name = request.name,
            accountType = request.accountType,
            accountNumber = request.accountNumber,
            balance = BigDecimal.valueOf(request.initialBalance ?: 0.0),
            currency = request.currency ?: "CNY",
            icon = request.icon,
            color = request.color,
            notes = request.notes,
            isDefault = request.isDefault ?: false
        )

        val createdAccount = accountService.createAccount(userId, account)

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(AccountResponse.fromEntity(createdAccount))
    }

    @PutMapping("/{id}")
    fun updateAccount(
        @PathVariable id: Long,
        @Valid @RequestBody request: AccountRequest,
        authentication: Authentication
    ): ResponseEntity<AccountResponse> {
        val userId = authService.getCurrentUserId(authentication)

        val account = Account(
            userId = userId,
            name = request.name,
            accountType = request.accountType,
            accountNumber = request.accountNumber,
            balance = BigDecimal.ZERO, // Balance is not updated through this endpoint
            currency = request.currency ?: "CNY",
            icon = request.icon,
            color = request.color,
            notes = request.notes,
            isDefault = request.isDefault ?: false
        )

        val updatedAccount = accountService.updateAccount(userId, id, account)

        return ResponseEntity.ok(AccountResponse.fromEntity(updatedAccount))
    }

    @PutMapping("/{id}/balance")
    fun adjustBalance(
        @PathVariable id: Long,
        @RequestBody request: Map<String, Any>,
        authentication: Authentication
    ): ResponseEntity<AccountResponse> {
        val userId = authService.getCurrentUserId(authentication)

        val newBalance = JavaBigDecimal.valueOf(request["balance"] as Double)
        val reason = request["reason"] as? String ?: "余额调整"

        val adjustedAccount = accountService.adjustBalance(userId, id, newBalance, reason)

        return ResponseEntity.ok(AccountResponse.fromEntity(adjustedAccount))
    }

    @DeleteMapping("/{id}")
    fun deleteAccount(
        @PathVariable id: Long,
        authentication: Authentication
    ): ResponseEntity<Void> {
        val userId = authService.getCurrentUserId(authentication)
        accountService.deleteAccount(userId, id)

        return ResponseEntity.noContent().build()
    }
}
