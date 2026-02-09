package com.colafan.alfred.service

import com.colafan.alfred.dto.response.BudgetHierarchyDto
import com.colafan.alfred.dto.response.BudgetUsageResponse
import com.colafan.alfred.dto.response.CalendarCellDto
import com.colafan.alfred.dto.response.CategoryBudgetDetailDto
import com.colafan.alfred.entity.Budget
import com.colafan.alfred.entity.Category
import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.BudgetRepository
import com.colafan.alfred.repository.CategoryRepository
import com.colafan.alfred.repository.TransactionRepository
import com.colafan.alfred.util.BudgetCalculator
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate

@Service
class BudgetService(
    private val budgetRepository: BudgetRepository,
    private val transactionRepository: TransactionRepository,
    private val categoryRepository: CategoryRepository
) {

    fun getBudgetsByUserId(userId: Long): List<Budget> {
        return budgetRepository.findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId)
    }

    fun getBudgetById(userId: Long, budgetId: Long): Budget {
        val budget = budgetRepository.findByIdOrNull(budgetId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "预算不存在")

        if (budget.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此预算")
        }

        return budget
    }

    fun getBudgetByCategory(userId: Long, categoryId: Long): Budget? {
        return budgetRepository.findByUserIdAndCategoryIdAndIsActiveTrue(userId, categoryId)
    }

    @Transactional
    fun createBudget(userId: Long, budget: Budget): Budget {
        // 检查是否已存在该分类的预算
        val existingBudget = budgetRepository.findByUserIdAndCategoryIdAndIsActiveTrue(
            userId,
            budget.categoryId
        )

        if (existingBudget != null) {
            throw ApiException(ErrorCode.CONFLICT, "该分类已有预算设置")
        }

        val newBudget = budget.copy(
            userId = userId,
            isActive = true
        )

        return budgetRepository.save(newBudget)
    }

    @Transactional
    fun updateBudget(userId: Long, budgetId: Long, updatedBudget: Budget): Budget {
        val existingBudget = getBudgetById(userId, budgetId)

        val budgetToUpdate = existingBudget.copy(
            amount = updatedBudget.amount,
            period = updatedBudget.period,
            pattern = updatedBudget.pattern,
            alertThreshold = updatedBudget.alertThreshold,
            isRecurring = updatedBudget.isRecurring,
            startDate = updatedBudget.startDate,
            endDate = updatedBudget.endDate
        )

        return budgetRepository.save(budgetToUpdate)
    }

    @Transactional
    fun deleteBudget(userId: Long, budgetId: Long) {
        val budget = getBudgetById(userId, budgetId)

        // 先物理删除相同 (user_id, category_id) 的已软删除记录，避免唯一约束冲突
        val inactiveBudgets = budgetRepository.findByUserIdAndCategoryId(userId, budget.categoryId)
            .filter { !it.isActive }
        if (inactiveBudgets.isNotEmpty()) {
            inactiveBudgets.forEach { budgetRepository.delete(it) }
            budgetRepository.flush()  // 立即生效
        }

        // 软删除当前预算
        val budgetToDelete = budget.copy(isActive = false)
        budgetRepository.save(budgetToDelete)
    }

    fun getBudgetCount(userId: Long): Long {
        return budgetRepository.countByUserId(userId)
    }

    /**
     * 获取预算使用情况（改进版）
     * 支持周期计算（日/周/月/年）和pattern过滤（workday/weekend）
     */
    fun getBudgetUsage(userId: Long): List<BudgetUsageResponse> {
        val budgets = getBudgetsByUserId(userId)
        val currentDate = LocalDate.now()

        return budgets.map { budget ->
            // 获取分类信息
            val category: Category? = categoryRepository.findByIdOrNull(budget.categoryId)

            // 1. 确定周期范围
            val (start, end) = BudgetCalculator.getPeriodRange(budget.period, currentDate)

            // 2. 获取周期内所有符合条件的日期（根据pattern过滤）
            val applicableDates = BudgetCalculator.filterDatesByPattern(start..end, budget.pattern)

            // 3. 查询该分类下在预算时间范围内的所有支出交易
            val allTransactions = transactionRepository
                .findByUserIdAndCategoryIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                    userId = userId,
                    categoryId = budget.categoryId,
                    startDate = start.atStartOfDay(),
                    endDate = end.atTime(23, 59, 59)
                )

            // 4. 根据pattern过滤交易（只统计符合pattern的日期的交易）
            val filteredTransactions = allTransactions.filter { transaction ->
                val transactionDate = transaction.transactionDate.toLocalDate()
                BudgetCalculator.isDateMatchPattern(transactionDate, budget.pattern)
            }

            // 5. 计算已使用金额（只计算支出）
            val usedAmount = filteredTransactions
                .filter { it.type == "expense" }
                .fold(BigDecimal.ZERO) { acc, transaction ->
                    acc.add(transaction.amount)
                }

            val categoryName = category?.name
            val categoryIcon = category?.icon
            val categoryColor = category?.color

            BudgetUsageResponse.fromEntity(budget, categoryName, categoryIcon, categoryColor, usedAmount)
        }
    }

    /**
     * 获取日历数据
     * @param userId 用户ID
     * @param view 视图类型 (day, week, month, year)
     * @param date 参考日期
     * @return 日历单元格列表
     */
    fun getCalendarData(userId: Long, view: String, date: LocalDate): List<CalendarCellDto> {
        val budgets = getBudgetsByUserId(userId)
        val cells = mutableListOf<CalendarCellDto>()

        when (view) {
            "day" -> {
                // 生成当月所有日期
                val daysInMonth = date.lengthOfMonth()
                for (day in 1..daysInMonth) {
                    val currentDate = date.withDayOfMonth(day)
                    val cell = calculateDayCell(currentDate, budgets, userId)
                    cells.add(cell)
                }
            }
            "week" -> {
                // 生成当月所有周（大约4-5周）
                val firstDayOfMonth = date.withDayOfMonth(1)
                val lastDayOfMonth = date.withDayOfMonth(date.lengthOfMonth())

                var weekStart = firstDayOfMonth
                var weekCount = 1
                while (weekStart.isBefore(lastDayOfMonth) || weekStart.isEqual(lastDayOfMonth)) {
                    val weekEnd = weekStart.plusDays(6)
                    val cell = calculateWeekCell(weekStart, budgets, userId, weekCount)
                    cells.add(cell)
                    weekStart = weekStart.plusDays(7)
                    weekCount++
                }
            }
            "month" -> {
                // 生成当年所有月
                for (month in 1..12) {
                    val currentDate = date.withMonth(month)
                    val cell = calculateMonthCell(currentDate, budgets, userId)
                    cells.add(cell)
                }
            }
            "year" -> {
                // 生成未来5年
                for (i in 0..4) {
                    val currentDate = date.plusYears(i.toLong())
                    val cell = calculateYearCell(currentDate, budgets, userId)
                    cells.add(cell)
                }
            }
        }

        return cells
    }

    /**
     * 映射前端period到后端period
     */
    private fun mapPeriod(period: String): String {
        return when (period) {
            "day" -> "daily"
            "week" -> "weekly"
            "month" -> "monthly"
            "year" -> "yearly"
            else -> period
        }
    }

    /**
     * 计算单日单元格数据
     */
    private fun calculateDayCell(
        date: LocalDate,
        budgets: List<Budget>,
        userId: Long
    ): CalendarCellDto {
        // 计算当日总预算（所有日预算的总和）
        val dayBudgets = budgets.filter { it.period == "daily" || it.period == "day" }
        val totalBudget = dayBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            acc.add(if (BudgetCalculator.isDateMatchPattern(date, budget.pattern)) budget.amount else BigDecimal.ZERO)
        }

        // 计算当日已用金额
        val used = transactionRepository
            .findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                userId = userId,
                startDate = date.atStartOfDay(),
                endDate = date.atTime(23, 59, 59)
            )
            .filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

        val percentage = if (totalBudget > BigDecimal.ZERO) {
            (used.divide(totalBudget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
        } else 0.0

        val status = when {
            percentage >= 100 -> "over"
            percentage >= 80 -> "warning"
            else -> "normal"
        }

        return CalendarCellDto(
            date = date,
            period = "day",
            budget = totalBudget,
            used = used,
            percentage = percentage,
            status = status
        )
    }

    /**
     * 计算周单元格数据
     */
    private fun calculateWeekCell(
        weekStart: LocalDate,
        budgets: List<Budget>,
        userId: Long,
        weekCount: Int
    ): CalendarCellDto {
        val weekEnd = weekStart.plusDays(6)

        // 计算本周总预算
        val dailyBudgets = budgets.filter { it.period == "daily" || it.period == "day" }
        val weeklyBudgets = budgets.filter { it.period == "weekly" || it.period == "week" }

        var totalBudget = BigDecimal.ZERO

        // 日预算聚合
        var day = weekStart
        while (day.isBefore(weekEnd) || day.isEqual(weekEnd)) {
            for (budget in dailyBudgets) {
                if (BudgetCalculator.isDateMatchPattern(day, budget.pattern)) {
                    totalBudget = totalBudget.add(budget.amount)
                }
            }
            day = day.plusDays(1)
        }

        // 周预算
        for (budget in weeklyBudgets) {
            if (BudgetCalculator.isDateMatchPattern(weekStart, budget.pattern)) {
                totalBudget = totalBudget.add(budget.amount)
            }
        }

        // 计算本周已用金额
        val used = transactionRepository
            .findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                userId = userId,
                startDate = weekStart.atStartOfDay(),
                endDate = weekEnd.atTime(23, 59, 59)
            )
            .filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

        val percentage = if (totalBudget > BigDecimal.ZERO) {
            (used.divide(totalBudget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
        } else 0.0

        val status = when {
            percentage >= 100 -> "over"
            percentage >= 80 -> "warning"
            else -> "normal"
        }

        return CalendarCellDto(
            date = weekStart,
            period = "week",
            budget = totalBudget,
            used = used,
            percentage = percentage,
            status = status
        )
    }

    /**
     * 计算月单元格数据
     */
    private fun calculateMonthCell(
        date: LocalDate,
        budgets: List<Budget>,
        userId: Long
    ): CalendarCellDto {
        val firstDay = date.withDayOfMonth(1)
        val lastDay = date.withDayOfMonth(date.lengthOfMonth())

        // 计算本月总预算
        val dailyBudgets = budgets.filter { it.period == "daily" || it.period == "day" }
        val weeklyBudgets = budgets.filter { it.period == "weekly" || it.period == "week" }
        val monthlyBudgets = budgets.filter { it.period == "monthly" || it.period == "month" }

        var totalBudget = BigDecimal.ZERO

        // 日预算聚合（粗略估算：天数 × 日预算）
        val daysInMonth = date.lengthOfMonth()
        for (budget in dailyBudgets) {
            val applicableDays = BudgetCalculator.filterDatesByPattern(firstDay..lastDay, budget.pattern).size
            totalBudget = totalBudget.add(budget.amount.multiply(BigDecimal.valueOf(applicableDays.toLong())))
        }

        // 周预算聚合（粗略估算：周数 × 周预算）
        val weeksInMonth = (daysInMonth + 6) / 7
        for (budget in weeklyBudgets) {
            totalBudget = totalBudget.add(budget.amount.multiply(BigDecimal.valueOf(weeksInMonth.toLong())))
        }

        // 月预算
        for (budget in monthlyBudgets) {
            totalBudget = totalBudget.add(budget.amount)
        }

        // 计算本月已用金额
        val used = transactionRepository
            .findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                userId = userId,
                startDate = firstDay.atStartOfDay(),
                endDate = lastDay.atTime(23, 59, 59)
            )
            .filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

        val percentage = if (totalBudget > BigDecimal.ZERO) {
            (used.divide(totalBudget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
        } else 0.0

        val status = when {
            percentage >= 100 -> "over"
            percentage >= 80 -> "warning"
            else -> "normal"
        }

        return CalendarCellDto(
            date = date,
            period = "month",
            budget = totalBudget,
            used = used,
            percentage = percentage,
            status = status
        )
    }

    /**
     * 计算年单元格数据
     */
    private fun calculateYearCell(
        date: LocalDate,
        budgets: List<Budget>,
        userId: Long
    ): CalendarCellDto {
        val firstDay = date.withDayOfYear(1)
        val lastDay = date.withDayOfYear(date.lengthOfYear())

        // 计算本年总预算
        val dailyBudgets = budgets.filter { it.period == "daily" || it.period == "day" }
        val weeklyBudgets = budgets.filter { it.period == "weekly" || it.period == "week" }
        val monthlyBudgets = budgets.filter { it.period == "monthly" || it.period == "month" }
        val yearlyBudgets = budgets.filter { it.period == "yearly" || it.period == "year" }

        var totalBudget = BigDecimal.ZERO

        // 日预算聚合（粗略估算：365 × 日预算）
        for (budget in dailyBudgets) {
            totalBudget = totalBudget.add(budget.amount.multiply(BigDecimal.valueOf(365)))
        }

        // 周预算聚合（粗略估算：52 × 周预算）
        for (budget in weeklyBudgets) {
            totalBudget = totalBudget.add(budget.amount.multiply(BigDecimal.valueOf(52)))
        }

        // 月预算聚合（12 × 月预算）
        for (budget in monthlyBudgets) {
            totalBudget = totalBudget.add(budget.amount.multiply(BigDecimal.valueOf(12)))
        }

        // 年预算
        for (budget in yearlyBudgets) {
            totalBudget = totalBudget.add(budget.amount)
        }

        // 计算本年已用金额
        val used = transactionRepository
            .findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                userId = userId,
                startDate = firstDay.atStartOfDay(),
                endDate = lastDay.atTime(23, 59, 59)
            )
            .filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

        val percentage = if (totalBudget > BigDecimal.ZERO) {
            (used.divide(totalBudget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
        } else 0.0

        val status = when {
            percentage >= 100 -> "over"
            percentage >= 80 -> "warning"
            else -> "normal"
        }

        return CalendarCellDto(
            date = date,
            period = "year",
            budget = totalBudget,
            used = used,
            percentage = percentage,
            status = status
        )
    }

    /**
     * 获取预算层级关系
     * @param userId 用户ID
     * @param date 日期
     * @param period 周期类型
     * @return 预算层级详情
     */
    fun getBudgetHierarchy(userId: Long, date: LocalDate, period: String): BudgetHierarchyDto {
        // 映射period到数据库格式
        val dbPeriod = mapPeriod(period)

        // 计算各层级预算
        val dayBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "daily")
            .fold(BigDecimal.ZERO) { acc, budget -> acc.add(budget.amount) }

        val weekBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "weekly")
            .fold(BigDecimal.ZERO) { acc, budget -> acc.add(budget.amount) }

        val monthBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "monthly")
            .fold(BigDecimal.ZERO) { acc, budget -> acc.add(budget.amount) }

        val yearBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "yearly")
            .fold(BigDecimal.ZERO) { acc, budget -> acc.add(budget.amount) }

        // 计算聚合预算
        val weekBudgetAggregate = dayBudgets.multiply(BigDecimal.valueOf(7))
        val monthBudgetAggregate = weekBudgetAggregate.add(monthBudgets)
        val yearBudgetAggregate = monthBudgetAggregate.multiply(BigDecimal.valueOf(12))

        // 总预算
        val totalBudget = when (dbPeriod) {
            "daily" -> dayBudgets
            "weekly" -> weekBudgetAggregate.add(weekBudgets)
            "monthly" -> monthBudgetAggregate
            "yearly" -> yearBudgetAggregate.add(yearBudgets)
            else -> BigDecimal.ZERO
        }

        // 计算已用金额
        val (start, end) = BudgetCalculator.getPeriodRange(dbPeriod, date)
        val used = transactionRepository
            .findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                userId = userId,
                startDate = start.atStartOfDay(),
                endDate = end.atTime(23, 59, 59)
            )
            .filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

        val percentage = if (totalBudget > BigDecimal.ZERO) {
            (used.divide(totalBudget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
        } else 0.0

        val status = when {
            percentage >= 100 -> "over"
            percentage >= 80 -> "warning"
            else -> "normal"
        }

        // 获取分类预算详情
        val categoryBudgets = getCategoryBudgetDetails(userId, start, end)

        return BudgetHierarchyDto(
            date = date,
            period = period,
            dayBudget = dayBudgets,
            weekBudgetAggregate = weekBudgetAggregate,
            weekSpecific = weekBudgets,
            monthBudgetAggregate = monthBudgetAggregate,
            monthSpecific = monthBudgets,
            yearBudgetAggregate = yearBudgetAggregate,
            yearSpecific = yearBudgets,
            totalBudget = totalBudget,
            used = used,
            percentage = percentage,
            status = status,
            categoryBudgets = categoryBudgets
        )
    }

    /**
     * 获取分类预算详情
     */
    private fun getCategoryBudgetDetails(
        userId: Long,
        startDate: LocalDate,
        endDate: LocalDate
    ): List<CategoryBudgetDetailDto> {
        val budgets = getBudgetsByUserId(userId)
        val categoryBudgets = mutableListOf<CategoryBudgetDetailDto>()

        for (budget in budgets) {
            val category = categoryRepository.findByIdOrNull(budget.categoryId)
            val categoryName = category?.name ?: "未知分类"

            // 计算该分类已用金额
            val used = transactionRepository
                .findByUserIdAndCategoryIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                    userId = userId,
                    categoryId = budget.categoryId,
                    startDate = startDate.atStartOfDay(),
                    endDate = endDate.atTime(23, 59, 59)
                )
                .filter { it.type == "expense" }
                .fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

            val percentage = if (budget.amount > BigDecimal.ZERO) {
                (used.divide(budget.amount, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
            } else 0.0

            val status = when {
                percentage >= 100 -> "over"
                percentage >= 80 -> "warning"
                else -> "normal"
            }

            categoryBudgets.add(
                CategoryBudgetDetailDto(
                    categoryId = budget.categoryId,
                    categoryName = categoryName,
                    budget = budget.amount,
                    used = used,
                    percentage = percentage,
                    status = status
                )
            )
        }

        return categoryBudgets
    }
}
