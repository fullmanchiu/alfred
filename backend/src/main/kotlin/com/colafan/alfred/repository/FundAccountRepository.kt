package com.colafan.alfred.repository

import com.colafan.alfred.entity.FundAccount
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface FundAccountRepository : JpaRepository<FundAccount, Long> {
    fun findByUserId(userId: Long): List<FundAccount>
    fun findByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId: Long): List<FundAccount>
    fun findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId: Long): List<FundAccount>
}
