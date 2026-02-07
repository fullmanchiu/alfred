package com.colafan.alfred.controller

import com.colafan.alfred.dto.request.FundAccountRequest
import com.colafan.alfred.dto.response.FundAccountResponse
import com.colafan.alfred.entity.FundAccount
import com.colafan.alfred.service.FundAccountService
import com.colafan.alfred.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.math.BigDecimal as JavaBigDecimal

@RestController
@RequestMapping("/api/v1/fund-accounts")
class FundAccountController(
    private val accountService: FundAccountService,
    private val authService: AuthService
) {

    data class AccountsListResponse(
        val accounts: List<FundAccountResponse>,
        val totalBalance: Double
    )

    @GetMapping
    fun getAccounts(
        @RequestParam(required = false) type: String?,
        authentication: Authentication
    ): ResponseEntity<AccountsListResponse> {
        val userId = authService.getCurrentUserId(authentication)

        val accounts = accountService.getAccountsWithBalances(userId)

        val filteredAccounts = if (type != null) {
            accounts.filter { it.accountType == type }
        } else {
            accounts
        }

        val totalBalance = filteredAccounts.sumOf { it.balance }

        return ResponseEntity.ok(
            AccountsListResponse(
                accounts = filteredAccounts,
                totalBalance = totalBalance
            )
        )
    }

    @GetMapping("/{id}")
    fun getAccount(
        @PathVariable id: Long,
        authentication: Authentication
    ): ResponseEntity<FundAccountResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val account = accountService.getAccountById(userId, id)

        return ResponseEntity.ok(FundAccountResponse.fromEntity(account))
    }

    @PostMapping
    fun createAccount(
        @Valid @RequestBody request: FundAccountRequest,
        authentication: Authentication
    ): ResponseEntity<FundAccountResponse> {
        val userId = authService.getCurrentUserId(authentication)

        // 处理货币列表：优先使用 currencies，否则使用 currency
        val currencies = request.currencies ?: listOf(request.currency ?: "CNY")
        val primaryCurrency = currencies.first()

        val account = FundAccount(
            userId = userId,
            name = request.name,
            accountType = request.accountType,
            accountNumber = request.accountNumber,
            balance = BigDecimal.valueOf(request.initialBalance ?: 0.0),
            currency = primaryCurrency,
            institutionName = request.institutionName,
            icon = request.icon,
            color = request.color,
            notes = request.notes,
            isDefault = request.isDefault ?: false,
            fpsId = request.fpsId,
            swiftCode = request.swiftCode,
            iban = request.iban
        )

        val createdAccount = accountService.createAccountWithCurrencies(userId, account, currencies)

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(accountService.getAccountsWithBalances(userId).find { it.id == createdAccount.id }
                ?: FundAccountResponse.fromEntity(createdAccount))
    }

    @PutMapping("/{id}")
    fun updateAccount(
        @PathVariable id: Long,
        @Valid @RequestBody request: FundAccountRequest,
        authentication: Authentication
    ): ResponseEntity<FundAccountResponse> {
        val userId = authService.getCurrentUserId(authentication)

        // 处理货币列表：优先使用 currencies，否则使用 currency
        val currencies = request.currencies ?: listOf(request.currency ?: "CNY")
        val primaryCurrency = currencies.first()

        val account = FundAccount(
            userId = userId,
            name = request.name,
            accountType = request.accountType,
            accountNumber = request.accountNumber,
            balance = BigDecimal.ZERO, // Balance is not updated through this endpoint
            currency = primaryCurrency,
            institutionName = request.institutionName,
            icon = request.icon,
            color = request.color,
            notes = request.notes,
            isDefault = request.isDefault ?: false,
            fpsId = request.fpsId,
            swiftCode = request.swiftCode,
            iban = request.iban
        )

        // 如果请求包含currencies字段，使用updateAccountWithCurrencies
        val updatedAccount = if (request.currencies != null) {
            accountService.updateAccountWithCurrencies(userId, id, account, currencies)
        } else {
            accountService.updateAccount(userId, id, account)
        }

        return ResponseEntity.ok(
            accountService.getAccountsWithBalances(userId).find { it.id == id }
                ?: FundAccountResponse.fromEntity(updatedAccount)
        )
    }

    @PutMapping("/{id}/balance")
    fun adjustBalance(
        @PathVariable id: Long,
        @RequestBody request: Map<String, Any>,
        authentication: Authentication
    ): ResponseEntity<FundAccountResponse> {
        val userId = authService.getCurrentUserId(authentication)

        val currency = request["currency"] as? String ?: "CNY"
        val newBalance = when (val balanceValue = request["balance"]) {
            is Number -> JavaBigDecimal(balanceValue.toString())
            is String -> JavaBigDecimal(balanceValue)
            else -> throw IllegalArgumentException("Invalid balance value: $balanceValue")
        }
        val reason = request["reason"] as? String

        val adjustedAccount = accountService.updateBalanceByCurrency(userId, id, currency, newBalance, reason)

        return ResponseEntity.ok(accountService.getAccountsWithBalances(userId).find { it.id == id }
            ?: FundAccountResponse.fromEntity(adjustedAccount))
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
