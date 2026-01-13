package com.colafan.alfred.security

import com.colafan.alfred.config.JwtConfig
import io.jsonwebtoken.*
import io.jsonwebtoken.security.Keys
import org.slf4j.LoggerFactory
import org.springframework.security.core.Authentication
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.stereotype.Component
import java.util.*

@Component
class JwtTokenProvider(private val jwtConfig: JwtConfig) {
    private val logger = LoggerFactory.getLogger(JwtTokenProvider::class.java)
    private val secretKey = Keys.hmacShaKeyFor(jwtConfig.secret.toByteArray())

    fun generateToken(userId: Long, username: String): String {
        val now = Date()
        val expiryDate = Date(now.time + jwtConfig.expiration)

        return Jwts.builder()
            .setSubject(userId.toString())
            .claim("username", username)
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(secretKey)
            .compact()
    }

    fun extractClaims(token: String): Claims {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .payload
    }

    fun getUserIdFromToken(token: String): Long? {
        return try {
            extractClaims(token).subject?.toLong()
        } catch (e: Exception) {
            logger.error("Failed to extract user ID from token: ${e.message}", e)
            null
        }
    }

    fun getUsernameFromToken(token: String): String? {
        return try {
            extractClaims(token)["username"] as? String
        } catch (e: Exception) {
            logger.error("Failed to extract username from token: ${e.message}", e)
            null
        }
    }

    fun validateToken(token: String): Boolean {
        try {
            extractClaims(token)
            return true
        } catch (e: JwtException) {
            logger.warn("Invalid JWT token: ${e.message}")
            return false
        } catch (e: Exception) {
            logger.error("Token validation error: ${e.message}", e)
            return false
        }
    }

    fun createAuthentication(userId: Long, username: String): Authentication {
        val userDetails = org.springframework.security.core.userdetails.User(
            username,
            "",
            mutableListOf()
        )
        return org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
            userDetails,
            null,
            userDetails.authorities
        )
    }
}
