package com.colafan.alfred.dto.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size

/**
 * 创建金融账户组请求
 */
data class CreateFundAccountGroupRequest(
    @field:NotNull(message = "机构ID不能为空")
    val institutionId: Long,

    @field:NotBlank(message = "账户名称不能为空")
    @field:Size(max = 100, message = "账户名称长度不能超过100个字符")
    val name: String,

    @field:Size(max = 100, message = "账号长度不能超过100个字符")
    val accountNumber: String? = null,

    @field:Size(max = 500, message = "描述长度不能超过500个字符")
    val description: String? = null,

    val isDefault: Boolean = false,

    @field:NotEmpty(message = "至少需要一个货币账户")
    val currencies: List<CreateCurrencyAccountRequest>
)
