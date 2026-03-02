package com.colafan.alfred.repository

import com.colafan.alfred.entity.TaskExecution
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 任务执行记录数据访问接口
 */
@Repository
interface TaskExecutionRepository : JpaRepository<TaskExecution, String> {
    /**
     * 根据任务名称查找执行记录，按创建时间倒序
     */
    fun findByTaskNameOrderByCreatedAtDesc(taskName: String): List<TaskExecution>

    /**
     * 查找所有执行记录，按创建时间倒序
     */
    fun findAllByOrderByCreatedAtDesc(): List<TaskExecution>
}
