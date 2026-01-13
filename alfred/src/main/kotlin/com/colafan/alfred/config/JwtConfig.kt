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
    var expiration: Long = 1800000L
        set(value) {
            field = value
        }
}
