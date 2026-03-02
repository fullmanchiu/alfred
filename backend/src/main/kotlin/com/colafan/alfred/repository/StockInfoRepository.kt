package com.colafan.alfred.repository

import com.colafan.alfred.entity.StockInfo
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 股票基本信息Repository
 */
@Repository
interface StockInfoRepository : JpaRepository<StockInfo, Long> {
    fun findByCode(code: String): StockInfo?
    fun existsByCode(code: String): Boolean

    /**
     * 按代码或名称模糊搜索股票
     */
    fun findByCodeContainingIgnoreCaseOrNameContainingIgnoreCase(
        code: String,
        name: String
    ): List<StockInfo>
}
