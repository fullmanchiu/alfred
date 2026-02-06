package com.colafan.alfred.dto.response

/**
 * 账户列表响应
 */
data class AccountsListResponse(
    val accounts: List<AccountGroupResponse>,
    val totalBalanceByCurrency: Map<String, Double>,
    val institutions: List<InstitutionResponse>
)
