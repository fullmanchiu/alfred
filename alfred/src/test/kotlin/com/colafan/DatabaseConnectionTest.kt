package com.colafan

import java.sql.DriverManager

fun main() {
    val url = "jdbc:postgresql://110.42.222.64:35432/alfred"
    val username = "alfred"
    val password = "7j5xS8ENKZe74Hde"

    try {
        println("正在连接到数据库...")
        println("URL: $url")
        println("用户: $username")

        Class.forName("org.postgresql.Driver")
        val connection = DriverManager.getConnection(url, username, password)

        println("✅ 数据库连接成功！")

        // 测试查询
        val statement = connection.createStatement()
        val resultSet = statement.executeQuery("SELECT version()")

        if (resultSet.next()) {
            println("PostgreSQL 版本: ${resultSet.getString(1)}")
        }

        // 检查数据库是否存在
        val dbStatement = connection.createStatement()
        val dbResult = dbStatement.executeQuery("SELECT current_database()")
        if (dbResult.next()) {
            println("当前数据库: ${dbResult.getString(1)}")
        }

        connection.close()
        println("连接已关闭")

    } catch (e: Exception) {
        println("❌ 数据库连接失败！")
        println("错误信息: ${e.message}")
        e.printStackTrace()
    }
}
