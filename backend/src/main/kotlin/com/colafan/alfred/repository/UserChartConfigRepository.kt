package com.colafan.alfred.repository

import com.colafan.alfred.entity.UserChartConfig
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 用户图表配置 Repository
 */
@Repository
interface UserChartConfigRepository : JpaRepository<UserChartConfig, Long> {
    /**
     * 根据用户ID查找配置
     */
    fun findByUserId(userId: Long): UserChartConfig?

    /**
     * 删除用户配置
     */
    fun deleteByUserId(userId: Long)
}
