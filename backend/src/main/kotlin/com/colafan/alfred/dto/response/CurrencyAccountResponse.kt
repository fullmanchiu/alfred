package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.CurrencyAccount

/**
 * 货币账户响应
 */
data class CurrencyAccountResponse(
    val id: Long,
    val currency: String,
    val balance: Double,
    val currencySymbol: String,
    val currencyName: String
) {
    companion object {
        fun fromEntity(account: CurrencyAccount): CurrencyAccountResponse {
            return CurrencyAccountResponse(
                id = account.id!!,
                currency = account.currency,
                balance = account.balance.toDouble(),
                currencySymbol = getCurrencySymbol(account.currency),
                currencyName = getCurrencyName(account.currency)
            )
        }

        private fun getCurrencySymbol(currency: String): String {
            return when (currency) {
                "CNY" -> "¥"
                "HKD" -> "HK$"
                "USD" -> "$"
                "EUR" -> "€"
                "MOP" -> "MOP$"
                else -> currency
            }
        }

        private fun getCurrencyName(currency: String): String {
            return when (currency) {
                "CNY" -> "人民币"
                "HKD" -> "港币"
                "USD" -> "美元"
                "EUR" -> "欧元"
                "MOP" -> "澳门元"
                else -> currency
            }
        }
    }
}
