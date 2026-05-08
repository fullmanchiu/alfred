package com.colafan.alfred.config

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.KotlinModule
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class JacksonConfig {

    /**
     * Configure Spring Boot's auto-configured ObjectMapper to:
     * 1. Ignore unknown fields (fixes DashScope SDK's Choice class missing "index" field)
     * 2. Support Kotlin data classes and Java 8 time types
     */
    @Bean
    fun objectMapperCustomizer(): Jackson2ObjectMapperBuilderCustomizer {
        return Jackson2ObjectMapperBuilderCustomizer { builder ->
            builder.featuresToDisable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            builder.featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            builder.modulesToInstall(KotlinModule.Builder().build())
            builder.modulesToInstall(JavaTimeModule())
        }
    }
}
