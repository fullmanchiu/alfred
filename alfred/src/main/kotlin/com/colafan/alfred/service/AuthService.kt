package com.colafan.alfred.service

import com.colafan.alfred.config.JwtConfig
import com.colafan.alfred.dto.request.LoginRequest
import com.colafan.alfred.dto.request.RegisterRequestJava
import com.colafan.alfred.dto.response.AuthResponse
import com.colafan.alfred.dto.response.UserResponse
import com.colafan.alfred.entity.Account
import com.colafan.alfred.entity.Category
import com.colafan.alfred.entity.User
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.exception.apiException
import com.colafan.alfred.repository.AccountRepository
import com.colafan.alfred.repository.CategoryRepository
import com.colafan.alfred.repository.UserRepository
import com.colafan.alfred.security.JwtTokenProvider
import org.slf4j.LoggerFactory
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val accountRepository: AccountRepository,
    private val categoryRepository: CategoryRepository,
    private val categoryService: CategoryService,
    private val passwordEncoder: PasswordEncoder,
    private val jwtTokenProvider: JwtTokenProvider,
    private val jwtConfig: JwtConfig
) {
    private val logger = LoggerFactory.getLogger(AuthService::class.java)

    @Transactional
    fun register(request: RegisterRequestJava): AuthResponse {
        logger.info("收到注册请求: username=${request.username}, password=${request.password}, email=${request.email}")

        // 验证必填字段
        requireNotNull(request.username) { "用户名不能为空" }
        requireNotNull(request.password) { "密码不能为空" }

        logger.info("注册请求: 用户名=${request.username}, 邮箱=${request.email}, 密码长度=${request.password!!.length}")

        // 检查用户名是否已存在
        if (userRepository.existsByUsername(request.username!!)) {
            logger.warn("注册失败: 用户名已存在: ${request.username}")
            throw apiException(ErrorCode.USER_ALREADY_EXISTS, request.username!!)
        }

        // 创建用户
        val user = User(
            username = request.username!!,
            password = passwordEncoder.encode(request.password!!),
            email = request.email,
            nickname = request.username!!
        )
        val savedUser = userRepository.save(user)
        logger.info("用户创建成功: ID=${savedUser.id}, 用户名=${savedUser.username}")

        // 初始化默认账户
        val defaultAccount = Account(
            name = "现金",
            userId = savedUser.id!!,
            accountType = "cash",
            balance = BigDecimal.valueOf(0.00),
            currency = "CNY",
            isDefault = true,
            icon = "account_balance_wallet",
            color = "#4CAF50"
        )
        accountRepository.save(defaultAccount)
        logger.info("默认账户创建成功: 账户ID=${defaultAccount.id}")

        // 初始化默认分类（从配置文件加载）
        val defaultCategories = categoryService.initDefaultCategories(savedUser.id!!)

        // 生成 Token
        val token = jwtTokenProvider.generateToken(savedUser.id!!, savedUser.username)

        logger.info("注册成功: 用户ID=${savedUser.id}, 用户名=${savedUser.username}")
        logger.info("Token 已生成: ${token.take(50)}...")

        return AuthResponse(
            token = token,
            tokenType = "bearer",
            expiresIn = jwtConfig.expiration / 1000,
            user = UserResponse(
                id = savedUser.id!!,
                username = savedUser.username,
                email = savedUser.email ?: "",
                nickname = savedUser.nickname ?: ""
            )
        )
    }

    fun login(request: LoginRequest): AuthResponse {
        logger.info("登入请求: 用户名=${request.username}, 密码长度=${request.password.length}")

        // 查询用户
        val user = userRepository.findByUsername(request.username)
            .orElseThrow { apiException(ErrorCode.USER_NOT_FOUND, request.username) }

        // 验证密码
        if (!passwordEncoder.matches(request.password, user.password)) {
            logger.warn("登录失败: 密码错误: ${request.username}")
            throw apiException(ErrorCode.INVALID_CREDENTIALS)
        }

        logger.info("登录成功: 用户ID=${user.id}, 用户名=${user.username}")

        // 生成 Token
        val token = jwtTokenProvider.generateToken(user.id!!, user.username)

        logger.info("Token 已生成: ${token.take(50)}...")

        return AuthResponse(
            token = token,
            tokenType = "bearer",
            expiresIn = jwtConfig.expiration / 1000,
            user = UserResponse(
                id = user.id!!,
                username = user.username,
                email = user.email ?: "",
                nickname = user.nickname ?: ""
            )
        )
    }

    fun getCurrentUser(): UserResponse {
        val authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().authentication
        val userDetails = authentication.principal as org.springframework.security.core.userdetails.User
        val user = userRepository.findByUsername(userDetails.username)
            .orElseThrow { apiException(ErrorCode.USER_NOT_FOUND, userDetails.username) }

        return UserResponse(
            id = user.id!!,
            username = user.username,
            email = user.email ?: "",
            nickname = user.nickname ?: ""
        )
    }

    fun getCurrentUserId(authentication: org.springframework.security.core.Authentication): Long {
        val userDetails = authentication.principal as org.springframework.security.core.userdetails.User
        val user = userRepository.findByUsername(userDetails.username)
            .orElseThrow { apiException(ErrorCode.USER_NOT_FOUND, userDetails.username) }
        return user.id!!
    }
}
