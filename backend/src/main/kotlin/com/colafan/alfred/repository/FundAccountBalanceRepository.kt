package com.colafan.alfred.repository

import com.colafan.alfred.entity.FundAccountBalance
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface FundAccountBalanceRepository : JpaRepository<FundAccountBalance, Long> {
    fun findByAccountId(accountId: Long): List<FundAccountBalance>
    fun findByAccountIdAndCurrency(accountId: Long, currency: String): FundAccountBalance?
    fun deleteByAccountId(accountId: Long)
}
