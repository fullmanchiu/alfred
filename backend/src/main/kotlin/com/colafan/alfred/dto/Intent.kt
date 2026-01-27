package com.colafan.alfred.dto

/**
 * 用户意图类型
 */
enum class Intent {
    /** 查询交易/消费 */
    QUERY_TRANSACTION,
    /** 添加交易/记账 */
    ADD_TRANSACTION,
    /** 查询预算 */
    QUERY_BUDGET,
    /** 查询健康数据 */
    QUERY_HEALTH,
    /** 查询活动/骑行 */
    QUERY_ACTIVITY,
    /** 闲聊 */
    CHAT,
    /** 未知意图 */
    UNKNOWN
}
