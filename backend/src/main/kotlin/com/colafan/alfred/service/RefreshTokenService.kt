package com.colafan.alfred.service

import com.colafan.alfred.config.JwtConfig
import com.colafan.alfred.entity.RefreshToken
import com.colafan.alfred.entity.User
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.RefreshTokenRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.time.LocalDateTime
import java.util.*

/**
 * Refresh Token 服务
 *
 * 实现滑动过期机制：
 * - 初始有效期 30 天
 * - 每次 refresh 时生成新 token 并重置过期时间
 * - 只要用户持续使用，就永不过期
 */
@Service
class RefreshTokenService(
    private val refreshTokenRepository: RefreshTokenRepository,
    private val jwtConfig: JwtConfig
) {
    private val logger = LoggerFactory.getLogger(RefreshTokenService::class.java)

    /**
     * 生成 refresh token
     */
    @Transactional
    fun createRefreshToken(user: User): RefreshToken {
        // 删除该用户的旧 refresh token
        refreshTokenRepository.deleteByUserId(user.id!!)

        // 生成新的 refresh token
        val token = UUID.randomUUID().toString()
        val hashedToken = hashToken(token)

        val refreshToken = RefreshToken(
            userId = user.id!!,
            token = hashedToken,
            expiresAt = LocalDateTime.now().plusSeconds(jwtConfig.refreshExpiration / 1000)
        )

        val saved = refreshTokenRepository.save(refreshToken)
        logger.debug("创建 refresh token: userId=${user.id}, expiresAt=${refreshToken.expiresAt}")

        // 返回未哈希的 token 给客户端
        return saved.copy(token = token)
    }

    /**
     * 验证 refresh token 并返回对应的用户信息
     */
    fun findByToken(token: String): RefreshToken {
        val hashedToken = hashToken(token)

        val refreshToken = refreshTokenRepository.findByToken(hashedToken)
            .orElseThrow { ApiException(ErrorCode.INVALID_REFRESH_TOKEN, "Refresh token 不存在") }

        if (refreshToken.isExpired()) {
            throw ApiException(ErrorCode.REFRESH_TOKEN_EXPIRED, "Refresh token 已过期")
        }

        return refreshToken
    }

    /**
     * 刷新 refresh token（滑动过期）
     *
     * 删除旧 token，生成新 token，重置过期时间
     */
    @Transactional
    fun refreshRefreshToken(oldToken: String): RefreshToken {
        val hashedOldToken = hashToken(oldToken)

        val oldRefreshToken = refreshTokenRepository.findByToken(hashedOldToken)
            .orElseThrow { ApiException(ErrorCode.INVALID_REFRESH_TOKEN, "Refresh token 不存在") }

        if (oldRefreshToken.isExpired()) {
            throw ApiException(ErrorCode.REFRESH_TOKEN_EXPIRED, "Refresh token 已过期")
        }

        // 删除旧 token
        refreshTokenRepository.deleteByToken(hashedOldToken)

        // 生成新 token
        val newToken = UUID.randomUUID().toString()
        val hashedNewToken = hashToken(newToken)

        val refreshToken = RefreshToken(
            userId = oldRefreshToken.userId,
            token = hashedNewToken,
            expiresAt = LocalDateTime.now().plusSeconds(jwtConfig.refreshExpiration / 1000)
        )

        val saved = refreshTokenRepository.save(refreshToken)
        logger.debug("刷新 refresh token: userId=${oldRefreshToken.userId}, newExpiresAt=${refreshToken.expiresAt}")

        // 返回未哈希的新 token
        return saved.copy(token = newToken)
    }

    /**
     * 删除用户的所有 refresh token（登出时使用）
     */
    @Transactional
    fun deleteByUserId(userId: Long) {
        logger.debug("删除用户的所有 refresh token: userId=$userId")
        refreshTokenRepository.deleteByUserId(userId)
    }

    /**
     * 删除指定的 refresh token
     */
    @Transactional
    fun deleteByToken(token: String) {
        val hashedToken = hashToken(token)
        logger.debug("删除 refresh token")
        refreshTokenRepository.deleteByToken(hashedToken)
    }

    /**
     * 清理过期的 refresh token
     */
    @Transactional
    fun cleanExpiredTokens() {
        val deleted = refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now())
        logger.debug("清理过期的 refresh token: 数量=$deleted")
    }

    /**
     * 对 token 进行 SHA-256 哈希
     */
    private fun hashToken(token: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(token.toByteArray(StandardCharsets.UTF_8))
        return hash.joinToString("") { "%02x".format(it) }
    }
}
