package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.FundAccountGroup
import com.colafan.alfred.entity.CurrencyAccount
import com.colafan.alfred.entity.Institution

/**
 * 金融账户组响应（用户感知的"金融账户"）
 */
data class FundAccountGroupResponse(
    val id: Long,
    val institutionId: Long,
    val institutionName: String,
    val institutionType: String,
    val name: String,
    val accountNumber: String?,
    val description: String?,
    val isDefault: Boolean,
    val currencies: List<CurrencyAccountResponse>,
    val totalBalance: Map<String, Double>
) {
    companion object {
        fun fromEntity(
            group: FundAccountGroup,
            institution: Institution,
            currencyAccounts: List<CurrencyAccount>
        ): FundAccountGroupResponse {
            val currencyResponses = currencyAccounts.map { CurrencyAccountResponse.fromEntity(it) }
            val totalBalance = currencyAccounts.associate { it.currency to it.balance.toDouble() }

            return FundAccountGroupResponse(
                id = group.id!!,
                institutionId = group.institutionId,
                institutionName = institution.name,
                institutionType = institution.type,
                name = group.name,
                accountNumber = group.accountNumber,
                description = group.description,
                isDefault = group.isDefault,
                currencies = currencyResponses,
                totalBalance = totalBalance
            )
        }
    }
}
