package com.colafan.alfred.repository

import com.colafan.alfred.entity.SystemAccount
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 系统权益账户数据访问接口
 */
@Repository
interface SystemAccountRepository : JpaRepository<SystemAccount, Long> {

    // 根据代码查询系统账户
    fun findByCode(code: String): SystemAccount?

    // 查询所有激活的系统账户
    fun findByIsActiveTrue(): List<SystemAccount>

    // 根据账户类型查询
    fun findByAccountType(accountType: String): List<SystemAccount>
}
