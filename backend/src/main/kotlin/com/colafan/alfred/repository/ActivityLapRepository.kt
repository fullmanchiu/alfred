package com.colafan.alfred.repository

import com.colafan.alfred.entity.ActivityLap
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 运动分段数据访问接口
 */
@Repository
interface ActivityLapRepository : JpaRepository<ActivityLap, Long> {

    /**
     * 查找指定运动的所有分段（按序号排序）
     */
    fun findByActivityIdOrderByLapIndex(activityId: Long): List<ActivityLap>

    /**
     * 统计指定运动的分段数量
     */
    fun countByActivityId(activityId: Long): Long
}
