package com.colafan.alfred.dto.request

data class AccountRequest(
    val name: String,
    val accountType: String,
    val accountNumber: String? = null,
    val initialBalance: Double? = 0.0,
    val currency: String? = "CNY",
    val icon: String? = null,
    val color: String? = null,
    val notes: String? = null,
    val isDefault: Boolean? = false
)
