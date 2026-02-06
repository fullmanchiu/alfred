package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.Institution

/**
 * 金融机构响应
 */
data class InstitutionResponse(
    val id: Long,
    val name: String,
    val type: String,
    val icon: String?,
    val color: String?,
    val countryCode: String,
    val accountCount: Int = 0
) {
    companion object {
        fun fromEntity(
            institution: Institution,
            accountCount: Int = 0
        ): InstitutionResponse {
            return InstitutionResponse(
                id = institution.id!!,
                name = institution.name,
                type = institution.type,
                icon = institution.icon,
                color = institution.color,
                countryCode = institution.countryCode,
                accountCount = accountCount
            )
        }
    }
}
