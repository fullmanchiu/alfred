package com.colafan.alfred.util

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.temporal.TemporalAdjusters

/**
 * 预算计算工具类
 * 用于处理周期范围计算和pattern过滤
 */
object BudgetCalculator {

    /**
     * 获取周期范围
     */
    fun getPeriodRange(period: String, currentDate: LocalDate): Pair<LocalDate, LocalDate> {
        return when (period) {
            "daily" -> currentDate to currentDate
            "weekly" -> getWeekRange(currentDate)
            "monthly" -> getMonthRange(currentDate)
            "yearly" -> getYearRange(currentDate)
            else -> throw IllegalArgumentException("Invalid period: $period")
        }
    }

    /**
     * 获取本周范围（周一到周日）
     */
    private fun getWeekRange(date: LocalDate): Pair<LocalDate, LocalDate> {
        val monday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val sunday = date.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
        return monday to sunday
    }

    /**
     * 获取本月范围（1号到月底）
     */
    private fun getMonthRange(date: LocalDate): Pair<LocalDate, LocalDate> {
        val firstDay = date.with(TemporalAdjusters.firstDayOfMonth())
        val lastDay = date.with(TemporalAdjusters.lastDayOfMonth())
        return firstDay to lastDay
    }

    /**
     * 获取本年范围（1月1日到12月31日）
     */
    private fun getYearRange(date: LocalDate): Pair<LocalDate, LocalDate> {
        val firstDay = date.withDayOfYear(1)
        val lastDay = date.withDayOfYear(date.lengthOfYear())
        return firstDay to lastDay
    }

    /**
     * 根据pattern过滤日期
     * @param range 日期范围
     * @param pattern 生效模式：all, workday, weekend
     * @return 符合pattern的所有日期
     */
    fun filterDatesByPattern(range: ClosedRange<LocalDate>, pattern: String): List<LocalDate> {
        val dates = mutableListOf<LocalDate>()
        var current = range.start
        while (current.isBefore(range.endInclusive) || current.isEqual(range.endInclusive)) {
            dates.add(current)
            current = current.plusDays(1)
        }

        return when (pattern) {
            "all" -> dates
            "workday" -> dates.filter { it.dayOfWeek.value < 6 }  // 周一到周五
            "weekend" -> dates.filter { it.dayOfWeek.value >= 6 }  // 周六日
            else -> dates
        }
    }

    /**
     * 检查日期是否匹配pattern
     */
    fun isDateMatchPattern(date: LocalDate, pattern: String): Boolean {
        return when (pattern) {
            "all" -> true
            "workday" -> date.dayOfWeek.value < 6
            "weekend" -> date.dayOfWeek.value >= 6
            else -> true
        }
    }
}
