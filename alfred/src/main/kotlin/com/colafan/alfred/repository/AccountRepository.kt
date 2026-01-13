package com.colafan.alfred.repository

import com.colafan.alfred.entity.Account
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.List

@Repository
interface AccountRepository : JpaRepository<Account, Long> {
    fun findByUserIdAndIsActiveTrue(userId: Long): List<Account>
}
