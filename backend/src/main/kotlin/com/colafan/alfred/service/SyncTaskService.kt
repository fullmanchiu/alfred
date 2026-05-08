package com.colafan.alfred.service

import com.colafan.alfred.entity.SyncTask
import com.colafan.alfred.repository.SyncTaskRepository
import com.colafan.alfred.repository.StockKlineRepository
import com.colafan.alfred.repository.StockInfoRepository
import com.fasterxml.jackson.databind.ObjectMapper
import com.colafan.alfred.config.PythonServiceConfig
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestTemplate
import java.time.LocalDateTime

/**
 * 同步任务服务
 */
@Service
class SyncTaskService(
    private val syncTaskRepository: SyncTaskRepository,
    private val stockKlineRepository: StockKlineRepository,
    private val stockInfoRepository: StockInfoRepository,
    private val objectMapper: ObjectMapper,
    private val pythonServiceConfig: PythonServiceConfig
) {
    companion object {
        private val logger = LoggerFactory.getLogger(SyncTaskService::class.java)
    }

    private val restTemplate = RestTemplate()

    /**
     * 获取用户的同步任务列表
     */
    fun getSyncTasks(userId: Long): List<SyncTask> {
        return syncTaskRepository.findByUserId(userId)
    }

    /**
     * 创建同步任务
     */
    @Transactional
    fun createTask(userId: Long, stockCode: String, taskName: String?, taskType: String, syncInterval: Int): SyncTask {
        // 检查股票是否存在
        val stockInfo = stockInfoRepository.findByCode(stockCode)
            ?: throw IllegalArgumentException("股票代码不存在: $stockCode")

        // 检查是否已存在相同任务
        val existing = syncTaskRepository.findByUserIdAndStockCodeAndTaskType(userId, stockCode, taskType)
        if (existing != null) {
            throw IllegalArgumentException("该股票的同步任务已存在")
        }

        val task = SyncTask(
            userId = userId,
            stockCode = stockCode,
            taskName = taskName ?: "${stockInfo.name} K线同步",
            taskType = taskType,
            syncInterval = syncInterval
        )

        return syncTaskRepository.save(task)
    }

    /**
     * 删除同步任务
     */
    @Transactional
    fun deleteTask(userId: Long, taskId: Long) {
        val task = syncTaskRepository.findById(taskId)
            .orElseThrow { IllegalArgumentException("任务不存在") }

        if (task.userId != userId) {
            throw IllegalArgumentException("无权删除该任务")
        }

        syncTaskRepository.delete(task)
        logger.info("用户 $userId 删除同步任务 $taskId")
    }

    /**
     * 启动任务
     */
    @Transactional
    fun startTask(userId: Long, taskId: Long): SyncTask {
        val task = syncTaskRepository.findById(taskId)
            .orElseThrow { IllegalArgumentException("任务不存在") }

        if (task.userId != userId) {
            throw IllegalArgumentException("无权操作该任务")
        }

        task.status = "running"
        task.enabled = true
        return syncTaskRepository.save(task)
    }

    /**
     * 停止任务
     */
    @Transactional
    fun stopTask(userId: Long, taskId: Long): SyncTask {
        val task = syncTaskRepository.findById(taskId)
            .orElseThrow { IllegalArgumentException("任务不存在") }

        if (task.userId != userId) {
            throw IllegalArgumentException("无权操作该任务")
        }

        task.status = "stopped"
        return syncTaskRepository.save(task)
    }

    /**
     * 手动触发同步
     */
    @Transactional
    fun triggerSync(userId: Long, taskId: Long): Map<String, Any> {
        val task = syncTaskRepository.findById(taskId)
            .orElseThrow { IllegalArgumentException("任务不存在") }

        if (task.userId != userId) {
            throw IllegalArgumentException("无权操作该任务")
        }

        return executeSync(task)
    }

    /**
     * 根据股票代码触发同步（用于快速分析前的自动同步）
     * 如果股票不存在于数据库，会自动尝试获取数据并创建
     */
    @Transactional
    fun syncByCode(userId: Long, stockCode: String): Map<String, Any> {
        // 查找或创建任务
        var task = syncTaskRepository.findByUserIdAndStockCodeAndTaskType(userId, stockCode, "kline")

        if (task == null) {
            // 检查股票是否存在，不存在也允许创建任务（Python同步时会获取股票信息）
            val stockInfo = stockInfoRepository.findByCode(stockCode)
            val taskName = if (stockInfo != null) {
                "${stockInfo.name} K线同步"
            } else {
                "$stockCode K线同步"
            }

            task = SyncTask(
                userId = userId,
                stockCode = stockCode,
                taskName = taskName,
                taskType = "kline"
            )
            task = syncTaskRepository.save(task)
        }

        return executeSync(task)
    }

    /**
     * 执行同步（调用Python微服务）
     */
    private fun executeSync(task: SyncTask): Map<String, Any> {
        try {
            task.status = "running"
            syncTaskRepository.save(task)

            // 调用Python微服务执行同步
            val url = "${pythonServiceConfig.baseUrl}/api/sync/execute"
            val request = mapOf(
                "stock_code" to task.stockCode,
                "task_id" to task.id
            )

            @Suppress("UNCHECKED_CAST")
            val response = restTemplate.postForObject(url, request, Map::class.java) as? Map<String, Any>

            if (response != null && response["success"] == true) {
                @Suppress("UNCHECKED_CAST")
                val data = response["data"] as? Map<String, Any>
                val recordsCount = (data?.get("records_count") as? Number)?.toInt() ?: 0

                task.lastSyncAt = LocalDateTime.now()
                task.lastSyncStatus = "success"
                task.lastSyncRecords = recordsCount
                task.totalRecords += recordsCount
                task.lastError = null
                task.status = "stopped"

                syncTaskRepository.save(task)

                logger.info("同步任务 ${task.id} 执行成功，同步 $recordsCount 条记录")

                return mapOf(
                    "success" to true,
                    "recordsCount" to recordsCount,
                    "message" to "同步成功"
                )
            } else {
                val errorMsg = response?.get("message")?.toString() ?: "同步失败"
                throw RuntimeException(errorMsg)
            }
        } catch (e: Exception) {
            logger.error("同步任务 ${task.id} 执行失败: ${e.message}", e)

            task.status = "error"
            task.lastSyncAt = LocalDateTime.now()
            task.lastSyncStatus = "failed"
            task.lastError = e.message

            syncTaskRepository.save(task)

            return mapOf(
                "success" to false,
                "message" to "同步失败: ${e.message}"
            )
        }
    }

    /**
     * 检查股票数据是否存在
     */
    fun checkStockData(stockCode: String): Map<String, Any> {
        val stockInfo = stockInfoRepository.findByCode(stockCode)

        if (stockInfo == null) {
            return mapOf(
                "hasData" to false,
                "klineCount" to 0,
                "suggestSync" to true,
                "message" to "股票代码不存在，请检查股票代码是否正确"
            )
        }

        val klineCount = stockKlineRepository.countByStockId(stockInfo.id!!)
        val latestKline = stockKlineRepository.findLatestKLines(stockInfo.id!!, 1).firstOrNull()

        return mapOf(
            "hasData" to (klineCount > 0),
            "klineCount" to klineCount,
            "latestDate" to (latestKline?.tradeDate?.toString() ?: ""),
            "suggestSync" to (klineCount == 0),
            "message" to if (klineCount > 0) "数据正常" else "该股票尚未同步数据"
        )
    }

    /**
     * 获取任务详情
     */
    fun getTask(userId: Long, taskId: Long): SyncTask {
        val task = syncTaskRepository.findById(taskId)
            .orElseThrow { IllegalArgumentException("任务不存在") }

        if (task.userId != userId) {
            throw IllegalArgumentException("无权访问该任务")
        }

        return task
    }
}
