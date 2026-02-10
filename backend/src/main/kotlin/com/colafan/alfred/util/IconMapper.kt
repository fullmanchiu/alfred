package com.colafan.alfred.util

/**
 * Material Icons hex code to name mapper
 *
 * 将数据库中的 hex code 转换为 Material Icon 名称
 */
object IconMapper {

    /**
     * 将 hex code 转换为 Material Icon 名称
     *
     * @param hexCode 数据库存储的 hex code（如 "e56c"）
     * @return Material Icon 名称（如 "restaurant"），如果未找到则返回默认图标
     */
    fun hexToName(hexCode: String?): String {
        if (hexCode == null) return "help"

        return when (hexCode.lowercase()) {
            // 餐饮
            "e56c" -> "restaurant"
            "ea3b" -> "rice_bowl"
            "ea61" -> "lunch_dining"
            "ea57" -> "dinner_dining"
            "eaac" -> "fastfood"
            "e541" -> "local_cafe"
            "ea73" -> "nights_stay"

            // 交通
            "e531" -> "directions_car"
            "e535" -> "directions_transit"
            "e559" -> "local_taxi"
            "e54f" -> "local_parking"
            "e558" -> "ev_station"
            "f10b" -> "build"
            "e1d5" -> "verified_user"
            "e534" -> "train"
            "e539" -> "flight"
            "e52f" -> "directions_bike"

            // 购物
            "e8cc" -> "shopping_cart"
            "e8d1" -> "shopping_basket"
            "f19e" -> "checkroom"
            "e1b1" -> "devices"
            "e16b" -> "weekend"

            // 住房
            "e88a" -> "home"
            "ea40" -> "payments"
            "e3e4" -> "water_drop"
            "e1c9" -> "bolt"
            "e7d6" -> "local_fire_department"
            "e53a" -> "apartment"
            "e1e2" -> "wifi"

            // 通讯
            "e0cd" -> "phone"
            "e325" -> "edit"
            "e0be" -> "data_usage"
            "e328" -> "router"

            // 订阅
            "f01f" -> "subscriptions"
            "e405" -> "play_circle"
            "e30a" -> "computer"
            "e50a" -> "sports_esports"
            "ea19" -> "menu_book"
            "e338" -> "sports_esports"

            // 宠物
            "e91d" -> "pets"
            "e548" -> "medical_services"
            "e87c" -> "content_cut"

            // 娱乐
            "e407" -> "flight"
            "e02c" -> "movie"
            "ea66" -> "mic"

            // 健康
            "f033" -> "medication"
            "e85d" -> "local_hospital"
            "f109" -> "assignment"
            "eb4c" -> "health_and_safety"

            // 教育
            "e80c" -> "school"
            "e84f" -> "attach_money"
            "efec" -> "cast_for_education"
            "f04c" -> "quiz"

            // 人情
            "e8f6" -> "favorite"
            "e8dc" -> "card_giftcard"
            "e8b1" -> "restaurant"
            "e87d" -> "card_giftcard"
            "e25a" -> "volunteer_activism"
            "e227" -> "savings"

            // 薪资
            "ef63" -> "payments"
            "e8f9" -> "work"
            "e227" -> "savings"
            "e8d0" -> "redeem"
            "e8e5" -> "request_quote"
            "e145" -> "add_circle"
            "e850" -> "account_balance_wallet"

            // 理财
            "e2eb" -> "trending_up"
            "e6e1" -> "show_chart"
            "e870" -> "poll"
            "ebc5" -> "monetization_on"
            "eb70" -> "savings"
            "e263" -> "price_change"

            // 其他
            "e574" -> "help"

            else -> "help"
        }
    }

    /**
     * 获取交易类型的默认图标
     */
    fun getTransactionTypeIcon(type: String, isInflow: Boolean? = null): String {
        return when (type) {
            "income" -> "trending_up"
            "expense" -> "trending_down"
            "transfer" -> "swap_horiz"
            "adjustment" -> if (isInflow == true) "add_circle" else "remove_circle"
            "loan_in" -> "call_received"
            "loan_out" -> "call_made"
            "repayment" -> "payments"
            else -> "help"
        }
    }

    /**
     * 获取交易类型的显示颜色
     */
    fun getTransactionTypeColor(type: String, isInflow: Boolean? = null): String {
        return when (type) {
            "income" -> "#52c41a"
            "expense" -> "#ff4d4f"
            "transfer" -> "#722ed1"
            "adjustment" -> "#1890ff"
            else -> "#8c8c8c"
        }
    }

    /**
     * 获取交易类型的显示名称
     */
    fun getTransactionTypeDisplayName(type: String, isInflow: Boolean? = null): String {
        return when (type) {
            "income" -> "收入"
            "expense" -> "支出"
            "transfer" -> if (isInflow == true) "转入" else "转出"
            "adjustment" -> if (isInflow == true) "余额校准(增加)" else "余额校准(减少)"
            "loan_in" -> "借入"
            "loan_out" -> "借出"
            "repayment" -> "还款"
            else -> "未知"
        }
    }
}
