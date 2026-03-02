package com.colafan.alfred.repository

import com.colafan.alfred.entity.SyncTask
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 同步任务Repository
 */
@Repository
interface SyncTaskRepository : JpaRepository<SyncTask, Long> {
    /**
     * 根据用户ID查询任务列表
     */
    fun findByUserId(userId: Long): List<SyncTask>

    /**
     * 根据用户ID和股票代码查询任务
     */
    fun findByUserIdAndStockCode(userId: Long, stockCode: String): SyncTask?

    /**
     * 根据用户ID、股票代码和任务类型查询任务
     */
    fun findByUserIdAndStockCodeAndTaskType(userId: Long, stockCode: String, taskType: String): SyncTask?

    /**
     * 查询运行中的任务
     */
    fun findByStatus(status: String): List<SyncTask>

    /**
     * 查询启用的任务
     */
    fun findByEnabledTrue(): List<SyncTask>

    /**
     * 根据用户ID和任务ID删除
     */
    fun deleteByIdAndUserId(id: Long, userId: Long): Int
}
