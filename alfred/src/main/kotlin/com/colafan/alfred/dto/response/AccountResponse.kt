package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.Account
import java.time.LocalDateTime

data class AccountResponse(
    val id: Long,
    val name: String,
    val accountType: String,
    val accountNumber: String = "",
    val balance: Double,
    val currency: String,
    val isDefault: Boolean,
    val icon: String = "",
    val color: String = "",
    val notes: String = "",
    val createdAt: LocalDateTime
) {
    companion object {
        fun fromEntity(account: Account): AccountResponse {
            return AccountResponse(
                id = account.id!!,
                name = account.name,
                accountType = account.accountType,
                accountNumber = account.accountNumber ?: "",
                balance = account.balance.toDouble(),
                currency = account.currency,
                isDefault = account.isDefault,
                icon = account.icon ?: "",
                color = account.color ?: "",
                notes = account.notes ?: "",
                createdAt = account.createdAt!!
            )
        }
    }
}
