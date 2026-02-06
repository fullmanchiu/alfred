package com.colafan.alfred.repository

import com.colafan.alfred.entity.Posting
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/**
 * 复式记账分录数据访问接口
 */
@Repository
interface PostingRepository : JpaRepository<Posting, Long> {

    // 根据交易ID查询所有分录
    fun findByTransactionId(transactionId: Long): List<Posting>

    // 根据用户账户ID查询所有分录
    fun findByUserAccountId(userAccountId: Long): List<Posting>

    // 根据系统账户ID查询所有分录
    fun findBySystemAccountId(systemAccountId: Long): List<Posting>

    // 根据交易ID和用户账户ID查询单条分录
    fun findByTransactionIdAndUserAccountId(transactionId: Long, userAccountId: Long): List<Posting>

    // 根据交易ID和系统账户ID查询单条分录
    fun findByTransactionIdAndSystemAccountId(transactionId: Long, systemAccountId: Long): List<Posting>
}
