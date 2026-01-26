package com.colafan.alfred

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class AlfredApplication

fun main(args: Array<String>) {
	runApplication<AlfredApplication>(*args)
}
