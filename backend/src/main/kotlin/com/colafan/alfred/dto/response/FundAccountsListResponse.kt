package com.colafan.alfred.dto.response

/**
 * 金融账户列表响应
 */
data class AccountsListResponse(
    val accounts: List<FundAccountGroupResponse>,
    val totalBalanceByCurrency: Map<String, Double>,
    val institutions: List<InstitutionResponse>
)
