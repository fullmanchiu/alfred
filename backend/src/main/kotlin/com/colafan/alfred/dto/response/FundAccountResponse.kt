package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.FundAccount
import com.colafan.alfred.entity.FundAccountBalance
import java.time.LocalDateTime

data class FundAccountBalanceResponse(
    val currency: String,
    val balance: Double,
    val currencySymbol: String,
    val currencyName: String
) {
    companion object {
        fun fromEntity(balance: FundAccountBalance): FundAccountBalanceResponse {
            return FundAccountBalanceResponse(
                currency = balance.currency,
                balance = balance.balance.toDouble(),
                currencySymbol = getCurrencySymbol(balance.currency),
                currencyName = getCurrencyName(balance.currency)
            )
        }

        private fun getCurrencySymbol(currency: String): String {
            return when (currency) {
                "CNY" -> "¥"
                "HKD" -> "HK$"
                "USD" -> "$"
                "EUR" -> "€"
                "MOP" -> "MOP$"
                else -> "$"
            }
        }

        private fun getCurrencyName(currency: String): String {
            return when (currency) {
                "CNY" -> "人民币"
                "HKD" -> "港币"
                "USD" -> "美元"
                "EUR" -> "欧元"
                "MOP" -> "澳门币"
                else -> currency
            }
        }
    }
}

data class FundAccountResponse(
    val id: Long,
    val name: String,
    val accountType: String,
    val accountNumber: String = "",
    val balances: List<FundAccountBalanceResponse>,
    val institutionName: String? = null,
    val currency: String, // 保留兼容，表示主要货币
    val balance: Double, // 保留兼容，表示总余额
    val isDefault: Boolean,
    val icon: String = "",
    val color: String = "",
    val notes: String = "",
    val fpsId: String? = null,
    val swiftCode: String? = null,
    val iban: String? = null,
    val createdAt: LocalDateTime
) {
    companion object {
        fun fromEntityWithBalances(account: FundAccount, balances: List<FundAccountBalance>): FundAccountResponse {
            return FundAccountResponse(
                id = account.id!!,
                name = account.name,
                accountType = account.accountType,
                accountNumber = account.accountNumber ?: "",
                balances = balances.map { FundAccountBalanceResponse.fromEntity(it) },
                institutionName = account.institutionName,
                currency = account.currency,
                balance = balances.sumOf { it.balance.toDouble() }, // 总余额
                isDefault = account.isDefault,
                icon = account.icon ?: "",
                color = account.color ?: "",
                notes = account.notes ?: "",
                fpsId = account.fpsId,
                swiftCode = account.swiftCode,
                iban = account.iban,
                createdAt = account.createdAt!!
            )
        }

        // 保留旧方法用于兼容
        fun fromEntity(account: FundAccount): FundAccountResponse {
            return FundAccountResponse(
                id = account.id!!,
                name = account.name,
                accountType = account.accountType,
                accountNumber = account.accountNumber ?: "",
                balances = emptyList(),
                institutionName = account.institutionName,
                currency = account.currency,
                balance = account.balance.toDouble(),
                isDefault = account.isDefault,
                icon = account.icon ?: "",
                color = account.color ?: "",
                notes = account.notes ?: "",
                fpsId = account.fpsId,
                swiftCode = account.swiftCode,
                iban = account.iban,
                createdAt = account.createdAt!!
            )
        }
    }
}
