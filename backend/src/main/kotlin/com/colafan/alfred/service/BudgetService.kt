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
        // 检查是否已存在该分类和周期的预算
        val existingBudget = budgetRepository.findByUserIdAndCategoryIdAndPeriodAndIsActiveTrue(
            userId,
            budget.categoryId,
            budget.period
        )

        if (existingBudget != null) {
            throw ApiException(ErrorCode.CONFLICT, "该分类的${getPeriodName(budget.period)}预算已设置")
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

        // 直接修改现有对象，触发 @PreUpdate
        existingBudget.amount = updatedBudget.amount
        existingBudget.period = updatedBudget.period
        existingBudget.pattern = updatedBudget.pattern
        existingBudget.alertThreshold = updatedBudget.alertThreshold
        existingBudget.isRecurring = updatedBudget.isRecurring
        existingBudget.startDate = updatedBudget.startDate
        existingBudget.endDate = updatedBudget.endDate

        return budgetRepository.save(existingBudget)
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

        // 软删除当前预算，直接修改对象
        budget.isActive = false
        budgetRepository.save(budget)
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
        val dbPeriod = mapPeriod(period)

        // 获取所有预算
        val dailyBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "daily")
        val weeklyBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "weekly")
        val monthlyBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "monthly")
        val yearlyBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "yearly")

        // 计算日预算
        val dayBudget = dailyBudgets
            .filter { budget -> BudgetCalculator.isDateMatchPattern(date, budget.pattern) }
            .fold(BigDecimal.ZERO) { acc, budget -> acc.add(budget.amount) }

        // 计算周聚合预算：日预算 × 本周实际适用天数
        val (weekStart, weekEnd) = BudgetCalculator.getPeriodRange("weekly", date)
        val weekDaysCount = java.time.temporal.ChronoUnit.DAYS.between(weekStart, weekEnd).toInt() + 1
        val weekBudgetAggregate = dailyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            var applicableDays = 0
            for (dayOffset in 0 until weekDaysCount) {
                val currentDate = weekStart.plusDays(dayOffset.toLong())
                if (BudgetCalculator.isDateMatchPattern(currentDate, budget.pattern)) {
                    applicableDays++
                }
            }
            acc.add(budget.amount.multiply(BigDecimal.valueOf(applicableDays.toLong())))
        }

        // 计算月聚合预算：周聚合 + 本月实际周数 × 周预算 + 月预算
        val (monthStart, monthEnd) = BudgetCalculator.getPeriodRange("monthly", date)
        val monthDaysCount = java.time.temporal.ChronoUnit.DAYS.between(monthStart, monthEnd).toInt() + 1

        // 月内的日预算
        val monthDailyAggregate = dailyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            var applicableDays = 0
            for (dayOffset in 0 until monthDaysCount) {
                val currentDate = monthStart.plusDays(dayOffset.toLong())
                if (BudgetCalculator.isDateMatchPattern(currentDate, budget.pattern)) {
                    applicableDays++
                }
            }
            acc.add(budget.amount.multiply(BigDecimal.valueOf(applicableDays.toLong())))
        }

        // 月内的周预算：计算本月包含的完整周数
        val weeksInMonth = (monthDaysCount + 6) / 7
        val monthWeeklyAggregate = weeklyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            acc.add(budget.amount.multiply(BigDecimal.valueOf(weeksInMonth.toLong())))
        }

        val monthBudgetAggregate = monthDailyAggregate.add(monthWeeklyAggregate)

        // 计算年聚合预算：月聚合 × 12
        val yearBudgetAggregate = monthBudgetAggregate.multiply(BigDecimal.valueOf(12))

        // 周特有预算
        val weekSpecific = weeklyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            if (BudgetCalculator.isDateMatchPattern(date, budget.pattern)) acc.add(budget.amount) else acc
        }

        // 月特有预算
        val monthSpecific = monthlyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            if (BudgetCalculator.isDateMatchPattern(date, budget.pattern)) acc.add(budget.amount) else acc
        }

        // 年特有预算
        val yearSpecific = yearlyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            if (BudgetCalculator.isDateMatchPattern(date, budget.pattern)) acc.add(budget.amount) else acc
        }

        // 总预算
        val totalBudget = when (dbPeriod) {
            "daily" -> dayBudget
            "weekly" -> weekBudgetAggregate.add(weekSpecific)
            "monthly" -> monthBudgetAggregate.add(monthSpecific)
            "yearly" -> yearBudgetAggregate.add(yearSpecific)
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
        val categoryBudgets = getCategoryBudgetDetails(userId, start, end, dbPeriod)

        return BudgetHierarchyDto(
            date = date,
            period = period,
            dayBudget = dayBudget,
            weekBudgetAggregate = weekBudgetAggregate,
            weekSpecific = weekSpecific,
            monthBudgetAggregate = monthBudgetAggregate,
            monthSpecific = monthSpecific,
            yearBudgetAggregate = yearBudgetAggregate,
            yearSpecific = yearSpecific,
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
        endDate: LocalDate,
        period: String
    ): List<CategoryBudgetDetailDto> {
        val budgets = getBudgetsByUserId(userId)
        val periodCount = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate).toInt() + 1

        // 按分类聚合预算
        val categoryBudgetMap = mutableMapOf<Long, BigDecimal>()
        val categoryUsedMap = mutableMapOf<Long, BigDecimal>()

        for (budget in budgets) {
            val categoryId = budget.categoryId

            // 计算该预算在周期内的实际金额
            val budgetAmount = when (budget.period) {
                "daily" -> {
                    // 日预算：计算周期内适用天数
                    var applicableDays = 0
                    for (dayOffset in 0 until periodCount) {
                        val currentDate = startDate.plusDays(dayOffset.toLong())
                        if (BudgetCalculator.isDateMatchPattern(currentDate, budget.pattern)) {
                            applicableDays++
                        }
                    }
                    budget.amount.multiply(BigDecimal.valueOf(applicableDays.toLong()))
                }
                "weekly" -> {
                    // 周预算：计算周期内包含的周数
                    val weeksInPeriod = (periodCount + 6) / 7
                    budget.amount.multiply(BigDecimal.valueOf(weeksInPeriod.toLong()))
                }
                "monthly" -> {
                    // 月预算：对于周或日周期，按比例计算
                    if (period == "daily" || period == "weekly") {
                        val daysInMonth = startDate.lengthOfMonth().toDouble()
                        budget.amount.multiply(BigDecimal.valueOf(periodCount.toDouble())).divide(
                            BigDecimal.valueOf(daysInMonth),
                            2,
                            java.math.RoundingMode.HALF_UP
                        )
                    } else {
                        budget.amount
                    }
                }
                "yearly" -> {
                    // 年预算：对于周/月/日周期，按比例计算
                    val daysInYear = if (startDate.isLeapYear) 366 else 365
                    budget.amount.multiply(BigDecimal.valueOf(periodCount.toDouble())).divide(
                        BigDecimal.valueOf(daysInYear.toLong()),
                        2,
                        java.math.RoundingMode.HALF_UP
                    )
                }
                else -> BigDecimal.ZERO
            }

            categoryBudgetMap[categoryId] = (categoryBudgetMap[categoryId] ?: BigDecimal.ZERO).add(budgetAmount)

            // 计算该分类已用金额
            val used = transactionRepository
                .findByUserIdAndCategoryIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                    userId = userId,
                    categoryId = categoryId,
                    startDate = startDate.atStartOfDay(),
                    endDate = endDate.atTime(23, 59, 59)
                )
                .filter { it.type == "expense" }
                .fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

            categoryUsedMap[categoryId] = used
        }

        // 转换为DTO
        val categoryBudgets = mutableListOf<CategoryBudgetDetailDto>()
        for ((categoryId, budget) in categoryBudgetMap) {
            val used = categoryUsedMap[categoryId] ?: BigDecimal.ZERO
            val category = categoryRepository.findByIdOrNull(categoryId)
            val categoryName = category?.name ?: "未知分类"

            val percentage = if (budget > BigDecimal.ZERO) {
                (used.divide(budget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
            } else 0.0

            val status = when {
                percentage >= 100 -> "over"
                percentage >= 80 -> "warning"
                else -> "normal"
            }

            categoryBudgets.add(
                CategoryBudgetDetailDto(
                    categoryId = categoryId,
                    categoryName = categoryName,
                    budget = budget,
                    used = used,
                    percentage = percentage,
                    status = status
                )
            )
        }

        return categoryBudgets.sortedByDescending { it.budget }
    }

    /**
     * 获取周期名称
     */
    private fun getPeriodName(period: String): String {
        return when (period) {
            "daily" -> "日"
            "weekly" -> "周"
            "monthly" -> "月"
            "yearly" -> "年"
            else -> period
        }
    }
}
