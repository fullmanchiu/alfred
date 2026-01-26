package com.colafan.alfred.repository

import com.colafan.alfred.entity.HealthProfile
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

/**
 * 健康档案数据访问接口
 */
@Repository
interface HealthProfileRepository : JpaRepository<HealthProfile, Long> {

    /**
     * 查找指定用户的最新健康档案
     */
    fun findFirstByUserIdOrderByCreatedAtDesc(userId: Long): Optional<HealthProfile>

    /**
     * 查找指定用户最近一次有身高记录的健康档案
     * 用于更新时保留历史身高计算BMI
     */
    fun findFirstByUserIdAndHeightIsNotNullOrderByCreatedAtDesc(userId: Long): Optional<HealthProfile>

    /**
     * 查找指定用户的所有健康档案（按时间倒序）
     */
    fun findAllByUserIdOrderByCreatedAtDesc(userId: Long): List<HealthProfile>
}
