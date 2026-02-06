package com.colafan.alfred.repository

import com.colafan.alfred.entity.AccountGroup
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 账户组数据访问层
 */
@Repository
interface AccountGroupRepository : JpaRepository<AccountGroup, Long> {

    /**
     * 查询用户的所有账户组（包括软删除的）
     */
    fun findByUserId(userId: Long): List<AccountGroup>

    /**
     * 查询用户的所有激活账户组，按显示顺序和创建时间排序
     */
    fun findByUserIdAndIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc(userId: Long): List<AccountGroup>

    /**
     * 查询用户的默认账户组
     */
    fun findByUserIdAndIsDefaultTrue(userId: Long): AccountGroup?

    /**
     * 查询指定机构的所有激活账户组
     */
    fun findByInstitutionIdAndIsActiveTrue(institutionId: Long): List<AccountGroup>

    /**
     * 查询指定机构的所有账户组（包括未激活的）
     */
    fun findByInstitutionId(institutionId: Long): List<AccountGroup>

    /**
     * 检查用户是否有指定名称的账户组
     */
    fun existsByUserIdAndNameAndIsActiveTrue(userId: Long, name: String): Boolean
}
