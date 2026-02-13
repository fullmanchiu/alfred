package com.colafan.alfred.controller

import com.colafan.alfred.dto.response.FundAccountHistoryResponse
import com.colafan.alfred.service.FundAccountHistoryService
import com.colafan.alfred.service.FundAccountService
import com.colafan.alfred.service.AuthService
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

/**
 * 金融账户历史控制器
 *
 * 提供金融账户历史查询的 REST API
 */
@RestController
@RequestMapping("/api/v1/fund-accounts/{id}")
class FundAccountHistoryController(
    private val accountHistoryService: FundAccountHistoryService,
    private val fundAccountService: FundAccountService,
    private val authService: AuthService
) {

    /**
     * 获取金融账户的历史记录
     *
     * @param id 金融账户ID
     * @param currency 货币代码（可选）
     * @param page 页码（从0开始）
     * @param size 每页大小
     * @param authentication Spring Security 认证信息
     * @return 分页的历史记录
     */
    @GetMapping("/history")
    fun getFundAccountHistory(
        @PathVariable id: Long,
        @RequestParam(required = false) currency: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        authentication: Authentication
    ): ResponseEntity<Page<FundAccountHistoryResponse>> {
        val userId = authService.getCurrentUserId(authentication)

        // 验证金融账户是否属于当前用户（不存在或无权限会抛出异常）
        fundAccountService.getAccountById(userId, id)

        val pageable = PageRequest.of(
            page,
            size,
            Sort.by(Sort.Direction.DESC, "transactionDate")
        )

        val history = accountHistoryService.getFundAccountHistory(id, currency, pageable)

        return ResponseEntity.ok(history)
    }
}
