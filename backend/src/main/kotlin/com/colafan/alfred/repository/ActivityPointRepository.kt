package com.colafan.alfred.repository

import com.colafan.alfred.entity.ActivityPoint
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 运动轨迹点数据访问接口
 */
@Repository
interface ActivityPointRepository : JpaRepository<ActivityPoint, Long> {

    /**
     * 查找指定运动的所有轨迹点（按时间排序）
     */
    fun findByActivityIdOrderByTime(activityId: Long): List<ActivityPoint>

    /**
     * 统计指定运动的轨迹点数量
     */
    fun countByActivityId(activityId: Long): Long
}
