package com.colafan.alfred.repository

import com.colafan.alfred.entity.Account
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AccountRepository : JpaRepository<Account, Long> {
    fun findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId: Long): List<Account>
}
