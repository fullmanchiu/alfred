package com.colafan.alfred.service

import com.colafan.alfred.dto.request.AddCurrencyRequest
import com.colafan.alfred.dto.request.CreateAccountGroupRequest
import com.colafan.alfred.dto.request.CreateCurrencyAccountRequest
import com.colafan.alfred.dto.request.CreateInstitutionRequest
import com.colafan.alfred.dto.response.AccountGroupResponse
import com.colafan.alfred.dto.response.AccountsListResponse
import com.colafan.alfred.dto.response.CurrencyAccountResponse
import com.colafan.alfred.dto.response.InstitutionResponse
import com.colafan.alfred.entity.AccountGroup
import com.colafan.alfred.entity.CurrencyAccount
import com.colafan.alfred.entity.Institution
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.AccountGroupRepository
import com.colafan.alfred.repository.CurrencyAccountRepository
import com.colafan.alfred.repository.InstitutionRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

/**
 * 多货币账户服务
 * 实现三层账户结构：金融机构 → 账户组 → 货币账户
 */
@Service
class MultiCurrencyAccountService(
    private val institutionRepository: InstitutionRepository,
    private val accountGroupRepository: AccountGroupRepository,
    private val currencyAccountRepository: CurrencyAccountRepository
) {

    /**
     * 创建金融机构
     */
    fun createInstitution(userId: Long, request: CreateInstitutionRequest): InstitutionResponse {
        val institution = Institution(
            userId = userId,
            name = request.name,
            type = request.type,
            icon = request.icon,
            color = request.color,
            countryCode = request.countryCode,
            isActive = true
        )
        val savedInstitution = institutionRepository.save(institution)
        return InstitutionResponse.fromEntity(savedInstitution)
    }

    /**
     * 获取用户所有账户（带货币信息）
     */
    fun getUserAccounts(userId: Long): AccountsListResponse {
        // 1. 获取所有机构
        val institutions = institutionRepository
            .findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId)

        // 2. 获取所有账户组
        val accountGroups = accountGroupRepository
            .findByUserIdAndIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc(userId)

        // 3. 为每个账户组获取货币账户
        val accountResponses = accountGroups.map { group ->
            val institution = institutions.find { it.id == group.institutionId }
                ?: throw ApiException(ErrorCode.NOT_FOUND, "关联的机构不存在")

            val currencyAccounts = currencyAccountRepository
                .findByAccountGroupIdAndIsActiveTrue(group.id!!)

            AccountGroupResponse.fromEntity(group, institution, currencyAccounts)
        }

        // 4. 计算总余额（按币种）
        val totalBalanceByCurrency = currencyAccountRepository
            .findByUserIdAndIsActiveTrue(userId)
            .groupBy { it.currency }
            .mapValues { entry ->
                entry.value.sumOf { it.balance.toDouble() }
            }

        // 5. 构建机构响应（含账户数量）
        val institutionResponses = institutions.map { inst ->
            val accountCount = accountGroups.count { it.institutionId == inst.id }
            InstitutionResponse.fromEntity(inst, accountCount)
        }

        return AccountsListResponse(
            accounts = accountResponses,
            totalBalanceByCurrency = totalBalanceByCurrency,
            institutions = institutionResponses
        )
    }

    /**
     * 创建账户组（含多个货币账户）
     */
    @Transactional
    fun createAccountGroup(userId: Long, request: CreateAccountGroupRequest): AccountGroupResponse {
        // 1. 验证机构归属
        val institution = institutionRepository.findById(request.institutionId)
            .orElseThrow { ApiException(ErrorCode.NOT_FOUND, "机构不存在") }

        if (institution.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此机构")
        }

        // 2. 如果设置为默认账户，取消其他默认账户
        if (request.isDefault) {
            accountGroupRepository.findByUserIdAndIsDefaultTrue(userId)?.let { existingDefault ->
                val updatedGroup = existingDefault.copy(
                    isDefault = false,
                    updatedAt = java.time.LocalDateTime.now()
                )
                accountGroupRepository.save(updatedGroup)
            }
        }

        // 3. 创建账户组
        val accountGroup = AccountGroup(
            userId = userId,
            institutionId = request.institutionId,
            name = request.name,
            accountNumber = request.accountNumber,
            description = request.description,
            isDefault = request.isDefault,
            displayOrder = 0,
            isActive = true
        )
        val savedGroup = accountGroupRepository.save(accountGroup)

        // 4. 创建货币账户
        val currencyAccounts = request.currencies.map { currencyReq ->
            CurrencyAccount(
                userId = userId,
                accountGroupId = savedGroup.id!!,
                currency = currencyReq.currency,
                balance = BigDecimal.valueOf(currencyReq.initialBalance),
                isActive = true
            )
        }
        val savedCurrencyAccounts = currencyAccountRepository.saveAll(currencyAccounts).toList()

        // 5. 返回完整响应
        return AccountGroupResponse.fromEntity(
            savedGroup,
            institution,
            savedCurrencyAccounts
        )
    }

    /**
     * 为账户组添加新货币
     */
    @Transactional
    fun addCurrencyToAccount(
        userId: Long,
        accountGroupId: Long,
        request: AddCurrencyRequest
    ): AccountGroupResponse {
        // 1. 验证账户组归属
        val accountGroup = accountGroupRepository.findById(accountGroupId)
            .orElseThrow { ApiException(ErrorCode.NOT_FOUND, "账户不存在") }

        if (accountGroup.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此账户")
        }

        // 2. 检查货币是否已存在
        if (currencyAccountRepository.existsByAccountGroupIdAndCurrencyAndIsActiveTrue(
                accountGroupId,
                request.currency
            )
        ) {
            throw ApiException(ErrorCode.CONFLICT, "该货币已存在")
        }

        // 3. 创建货币账户
        val currencyAccount = CurrencyAccount(
            userId = userId,
            accountGroupId = accountGroupId,
            currency = request.currency,
            balance = BigDecimal.valueOf(request.initialBalance),
            isActive = true
        )
        currencyAccountRepository.save(currencyAccount)

        // 4. 返回更新后的账户组
        return getAccountGroupById(userId, accountGroupId)
    }

    /**
     * 按货币筛选账户
     */
    fun getAccountsByCurrency(userId: Long, currency: String): List<AccountGroupResponse> {
        val currencyAccounts = currencyAccountRepository
            .findByUserIdAndCurrencyAndIsActiveTrue(userId, currency)

        val accountGroupIds = currencyAccounts.map { it.accountGroupId }.distinct()
        val accountGroups = accountGroupRepository.findAllById(accountGroupIds)
        val institutions = institutionRepository.findAllById(
            accountGroups.map { it.institutionId }.distinct()
        )

        return currencyAccounts.map { ca ->
            val group = accountGroups.find { it.id == ca.accountGroupId }!!
            val institution = institutions.find { it.id == group.institutionId }!!
            AccountGroupResponse.fromEntity(group, institution, listOf(ca))
        }
    }

    /**
     * 获取单个账户组详情
     */
    fun getAccountGroupById(userId: Long, accountGroupId: Long): AccountGroupResponse {
        val accountGroup = accountGroupRepository.findById(accountGroupId)
            .orElseThrow { ApiException(ErrorCode.NOT_FOUND, "账户不存在") }

        if (accountGroup.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此账户")
        }

        val institution = institutionRepository.findById(accountGroup.institutionId)
            .orElseThrow { ApiException(ErrorCode.NOT_FOUND, "关联的机构不存在") }

        val currencyAccounts = currencyAccountRepository
            .findByAccountGroupIdAndIsActiveTrue(accountGroupId)

        return AccountGroupResponse.fromEntity(accountGroup, institution, currencyAccounts)
    }

    /**
     * 更新货币账户余额
     */
    @Transactional
    fun updateCurrencyAccountBalance(
        userId: Long,
        currencyAccountId: Long,
        amount: BigDecimal
    ) {
        val currencyAccount = currencyAccountRepository.findById(currencyAccountId)
            .orElseThrow { ApiException(ErrorCode.NOT_FOUND, "货币账户不存在") }

        if (currencyAccount.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此账户")
        }

        currencyAccount.balance = currencyAccount.balance.add(amount)
        currencyAccountRepository.save(currencyAccount)
    }

    /**
     * 货币账户转账
     */
    @Transactional
    fun transferBetweenCurrencyAccounts(
        userId: Long,
        fromAccountId: Long,
        toAccountId: Long,
        amount: BigDecimal
    ) {
        val fromAccount = currencyAccountRepository.findById(fromAccountId)
            .orElseThrow { ApiException(ErrorCode.NOT_FOUND, "转出账户不存在") }

        val toAccount = currencyAccountRepository.findById(toAccountId)
            .orElseThrow { ApiException(ErrorCode.NOT_FOUND, "转入账户不存在") }

        if (fromAccount.userId != userId || toAccount.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此账户")
        }

        if (fromAccount.balance.compareTo(amount) < 0) {
            throw ApiException(ErrorCode.BAD_REQUEST, "余额不足")
        }

        fromAccount.subtractBalance(amount)
        toAccount.addBalance(amount)

        currencyAccountRepository.saveAll(listOf(fromAccount, toAccount))
    }
}
