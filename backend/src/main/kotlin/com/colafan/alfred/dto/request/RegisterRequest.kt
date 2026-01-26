package com.colafan.alfred.dto.request

import com.fasterxml.jackson.annotation.JsonProperty
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

class RegisterRequest {
    @field:NotBlank(message = "用户名不能为空")
    @field:Size(min = 3, max = 50, message = "用户名长度必须在3-50之间")
    @JsonProperty("username")
    var username: String? = null

    @field:NotBlank(message = "密码不能为空")
    @field:Size(min = 6, max = 128, message = "密码长度必须在6-128之间")
    @JsonProperty("password")
    var password: String? = null

    @field:Email(message = "邮箱格式不正确")
    @JsonProperty("email")
    var email: String? = null
}
