package com.colafan.alfred.repository

import com.colafan.alfred.entity.Task
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 任务数据访问接口
 */
@Repository
interface TaskRepository : JpaRepository<Task, Int> {
    /**
     * 根据任务名称查找任务
     */
    fun findByName(name: String): Task?

    /**
     * 查找所有启用自动执行的任务
     */
    fun findByAutoRunTrue(): List<Task>
}
