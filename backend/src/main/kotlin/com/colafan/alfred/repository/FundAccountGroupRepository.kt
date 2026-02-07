package com.colafan.alfred.repository

import com.colafan.alfred.entity.FundAccountGroup
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 金融账户组数据访问层
 */
@Repository
interface FundAccountGroupRepository : JpaRepository<FundAccountGroup, Long> {

    /**
     * 查询用户的所有金融账户组（包括软删除的）
     */
    fun findByUserId(userId: Long): List<FundAccountGroup>

    /**
     * 查询用户的所有激活金融账户组，按显示顺序和创建时间排序
     */
    fun findByUserIdAndIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc(userId: Long): List<FundAccountGroup>

    /**
     * 查询用户的默认金融账户组
     */
    fun findByUserIdAndIsDefaultTrue(userId: Long): FundAccountGroup?

    /**
     * 查询指定机构的所有激活金融账户组
     */
    fun findByInstitutionIdAndIsActiveTrue(institutionId: Long): List<FundAccountGroup>

    /**
     * 查询指定机构的所有金融账户组（包括未激活的）
     */
    fun findByInstitutionId(institutionId: Long): List<FundAccountGroup>

    /**
     * 检查用户是否有指定名称的金融账户组
     */
    fun existsByUserIdAndNameAndIsActiveTrue(userId: Long, name: String): Boolean
}
