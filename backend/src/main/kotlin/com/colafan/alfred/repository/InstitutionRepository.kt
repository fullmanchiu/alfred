package com.colafan.alfred.repository

import com.colafan.alfred.entity.Institution
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 金融机构数据访问层
 */
@Repository
interface InstitutionRepository : JpaRepository<Institution, Long> {

    /**
     * 查询用户的所有机构（包括软删除的）
     */
    fun findByUserId(userId: Long): List<Institution>

    /**
     * 查询用户的所有激活机构，按创建时间倒序
     */
    fun findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId: Long): List<Institution>

    /**
     * 查询用户的指定类型的激活机构
     */
    fun findByUserIdAndTypeAndIsActiveTrue(userId: Long, type: String): Institution?

    /**
     * 检查用户是否已存在同类型的机构
     */
    fun existsByUserIdAndTypeAndIsActiveTrue(userId: Long, type: String): Boolean
}
