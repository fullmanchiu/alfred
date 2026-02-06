package com.colafan.alfred.repository

import com.colafan.alfred.entity.AccountBalance
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AccountBalanceRepository : JpaRepository<AccountBalance, Long> {
    fun findByAccountId(accountId: Long): List<AccountBalance>
    fun findByAccountIdAndCurrency(accountId: Long, currency: String): AccountBalance?
    fun deleteByAccountId(accountId: Long)
}
