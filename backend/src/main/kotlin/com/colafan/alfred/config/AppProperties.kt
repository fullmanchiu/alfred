package com.colafan.alfred.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

@Component
@ConfigurationProperties(prefix = "app")
data class AppProperties(
    val python: PythonProperties = PythonProperties()
) {
    data class PythonProperties(
        val websocketUrl: String = "ws://localhost:8001/ws"
    )
}
