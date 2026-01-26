package com.colafan.alfred.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthenticationFilter(
    private val jwtTokenProvider: JwtTokenProvider
) : OncePerRequestFilter() {

    private val logger = LoggerFactory.getLogger(JwtAuthenticationFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response)
            return
        }

        val token = authHeader.substring(7)

        if (!jwtTokenProvider.validateToken(token)) {
            logger.warn("Invalid JWT token provided")
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            response.writer.write("{\"success\": false, \"message\": \"无效或过期的令牌\"}")
            return
        }

        val userId = jwtTokenProvider.getUserIdFromToken(token)
        val username = jwtTokenProvider.getUsernameFromToken(token)

        if (userId == null || username == null) {
            logger.warn("Failed to extract user info from token")
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            response.writer.write("{\"success\": false, \"message\": \"令牌格式错误\"}")
            return
        }

        val authentication = jwtTokenProvider.createAuthentication(userId, username)
        (authentication as org.springframework.security.authentication.UsernamePasswordAuthenticationToken).details = WebAuthenticationDetailsSource().buildDetails(request)
        SecurityContextHolder.getContext().authentication = authentication

        logger.debug("User authenticated: userId=$userId, username=$username")

        filterChain.doFilter(request, response)
    }
}
