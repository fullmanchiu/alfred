package com.colafan.alfred.dto.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/**
 * 创建金融机构请求
 */
data class CreateInstitutionRequest(
    @field:NotBlank(message = "机构名称不能为空")
    @field:Size(max = 100, message = "机构名称长度不能超过100个字符")
    val name: String,

    @field:NotBlank(message = "机构类型不能为空")
    @field:Size(max = 20, message = "机构类型长度不能超过20个字符")
    val type: String,

    @field:Size(max = 50, message = "图标长度不能超过50个字符")
    val icon: String? = null,

    @field:Size(max = 20, message = "颜色长度不能超过20个字符")
    val color: String? = null,

    val countryCode: String = "CN"
)
