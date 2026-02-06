package com.colafan.alfred.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.bind.ConstructorBinding
import org.springframework.stereotype.Component

@Component
@ConfigurationProperties(prefix = "jwt")
class JwtConfig {
    var secret: String = ""
        set(value) {
            field = value
        }
    var expiration: Long = 1800000L  // 30分钟
        set(value) {
            field = value
        }
    var refreshExpiration: Long = 2592000000L  // 30天（30 * 24 * 60 * 60 * 1000）
        set(value) {
            field = value
        }
}
