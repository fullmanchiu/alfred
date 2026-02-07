package com.colafan.alfred.dto.request

data class FundAccountRequest(
    val name: String,
    val accountType: String,
    val accountNumber: String? = null,
    val initialBalance: Double? = 0.0,
    val currency: String? = "CNY",  // @deprecated 使用 currencies 代替
    val currencies: List<String>? = null,  // 新增：支持多货币
    val institutionName: String? = null,
    val icon: String? = null,
    val color: String? = null,
    val notes: String? = null,
    val isDefault: Boolean? = false,
    val fpsId: String? = null,
    val swiftCode: String? = null,
    val iban: String? = null
)
