package com.colafan.alfred.config

import jakarta.servlet.*
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class CorsFilter : Filter {

    override fun doFilter(request: ServletRequest, response: ServletResponse, chain: FilterChain) {
        val httpRequest = request as HttpServletRequest
        val httpResponse = response as HttpServletResponse

        val origin = httpRequest.getHeader("Origin")
        if (origin != null) {
            httpResponse.setHeader("Access-Control-Allow-Origin", origin)
        }

        httpResponse.setHeader("Access-Control-Allow-Credentials", "true")
        httpResponse.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
        httpResponse.setHeader("Access-Control-Allow-Headers", "*")
        httpResponse.setHeader("Access-Control-Max-Age", "3600")
        httpResponse.setHeader("Access-Control-Expose-Headers", "*")

        // Handle preflight request
        if ("OPTIONS" == httpRequest.method.uppercase()) {
            httpResponse.status = HttpServletResponse.SC_OK
            return
        }

        chain.doFilter(request, response)
    }

    override fun init(filterConfig: FilterConfig) {
        // Initialization if needed
    }

    override fun destroy() {
        // Cleanup if needed
    }
}
