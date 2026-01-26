package com.colafan.alfred.repository

import com.colafan.alfred.entity.Activity
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.repository.PagingAndSortingRepository
import org.springframework.stereotype.Repository

/**
 * 运动记录数据访问接口
 */
@Repository
interface ActivityRepository : JpaRepository<Activity, Long>, PagingAndSortingRepository<Activity, Long> {

    /**
     * 查找用户的运动记录（分页）
     */
    fun findByUserIdOrderByCreatedAtDesc(userId: Long, pageable: Pageable): Page<Activity>

    /**
     * 按类型查找用户的运动记录
     */
    fun findByUserIdAndTypeOrderByCreatedAtDesc(
        userId: Long,
        type: String,
        pageable: Pageable
    ): Page<Activity>

    /**
     * 统计用户的运动记录总数
     */
    fun countByUserId(userId: Long): Long
}
