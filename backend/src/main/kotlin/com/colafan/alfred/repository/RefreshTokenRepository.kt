package com.colafan.alfred.repository

import com.colafan.alfred.entity.RefreshToken
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.Optional

/**
 * Refresh Token Repository
 */
@Repository
interface RefreshTokenRepository : JpaRepository<RefreshToken, Long> {

    /**
     * 根据 token 查找
     */
    fun findByToken(token: String): Optional<RefreshToken>

    /**
     * 查找用户的有效 refresh token
     */
    fun findByUserIdAndExpiresAtAfter(
        userId: Long,
        now: LocalDateTime
    ): Optional<RefreshToken>

    /**
     * 删除用户的所有 refresh token
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.userId = :userId")
    fun deleteByUserId(@Param("userId") userId: Long)

    /**
     * 删除过期的 refresh token
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :now")
    fun deleteExpiredTokens(@Param("now") now: LocalDateTime)

    /**
     * 删除指定的 token
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.token = :token")
    fun deleteByToken(@Param("token") token: String)
}
