package com.colafan.alfred.repository

import com.colafan.alfred.entity.SystemConfig
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 系统配置数据访问接口
 */
@Repository
interface SystemConfigRepository : JpaRepository<SystemConfig, String> {
    /**
     * 根据键查找配置
     */
    fun findByKey(key: String): SystemConfig?
}
