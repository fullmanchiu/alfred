package com.colafan.alfred.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import jakarta.annotation.PostConstruct
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardOpenOption
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.locks.ReentrantLock

/**
 * 日志文件服务
 *
 * 负责管理任务执行日志的文件存储和读取
 */
@Service
class LogFileService {

    private val logger = LoggerFactory.getLogger(LogFileService::class.java)

    @Value("\${app.logs.dir:./logs}")
    private lateinit var logsDir: String

    private val fileLocks = mutableMapOf<String, ReentrantLock>()

    /**
     * 初始化日志目录
     */
    @PostConstruct
    fun init() {
        try {
            val dir = File(logsDir)
            if (!dir.exists()) {
                dir.mkdirs()
            }
        } catch (e: Exception) {
            logger.error("创建日志目录失败: ${e.message}", e)
        }
    }

    /**
     * 获取日志文件路径（相对路径）
     */
    fun getLogFilePath(executionId: String): String {
        return "task-${executionId}.log"
    }

    /**
     * 获取日志文件的完整路径
     */
    private fun getFullLogPath(executionId: String): Path {
        return Paths.get(logsDir, getLogFilePath(executionId))
    }

    /**
     * 获取文件锁
     */
    private fun getLock(executionId: String): ReentrantLock {
        return fileLocks.computeIfAbsent(executionId) { ReentrantLock() }
    }

    /**
     * 追加日志内容
     */
    @Synchronized
    fun appendLog(executionId: String, level: String, message: String) {
        val lock = getLock(executionId)
        lock.lock()
        try {
            val logPath = getFullLogPath(executionId)
            val timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            val logLine = "[$timestamp] [$level] $message\n"

            Files.write(
                logPath,
                logLine.toByteArray(Charsets.UTF_8),
                StandardOpenOption.CREATE,
                StandardOpenOption.APPEND
            )
        } catch (e: Exception) {
            logger.error("写入日志失败: executionId=$executionId, error=${e.message}", e)
        } finally {
            lock.unlock()
        }
    }

    /**
     * 读取日志内容
     */
    fun readLogs(executionId: String, fromLine: Int = 0): List<String> {
        val logPath = getFullLogPath(executionId)
        if (!Files.exists(logPath)) {
            return emptyList()
        }

        return try {
            Files.readAllLines(logPath, Charsets.UTF_8)
        } catch (e: Exception) {
            logger.error("读取日志失败: executionId=$executionId, error=${e.message}", e)
            emptyList()
        }
    }

    /**
     * 读取日志内容（从指定行数开始）
     */
    fun readLogsFrom(executionId: String, fromLine: Int): List<String> {
        val allLogs = readLogs(executionId)
        return if (fromLine < allLogs.size) {
            allLogs.drop(fromLine)
        } else {
            emptyList()
        }
    }

    /**
     * 获取日志行数
     */
    fun getLogLineCount(executionId: String): Int {
        return readLogs(executionId).size
    }

    /**
     * 删除日志文件
     */
    fun deleteLogFile(executionId: String): Boolean {
        val lock = getLock(executionId)
        lock.lock()
        try {
            val logPath = getFullLogPath(executionId)
            if (Files.exists(logPath)) {
                Files.delete(logPath)
                fileLocks.remove(executionId)
                return true
            }
            return false
        } catch (e: Exception) {
            logger.error("删除日志文件失败: executionId=$executionId, error=${e.message}", e)
            return false
        } finally {
            lock.unlock()
        }
    }

    /**
     * 清理旧日志文件（删除超过指定天数的日志）
     */
    @Async
    fun cleanupOldLogs(daysToKeep: Int = 7) {
        try {
            val dir = File(logsDir)
            val cutoffTime = System.currentTimeMillis() - (daysToKeep * 24 * 60 * 60 * 1000L)

            dir.listFiles()?.forEach { file ->
                if (file.isFile && file.lastModified() < cutoffTime) {
                    file.delete()
                    logger.debug("删除旧日志文件: ${file.name}")
                }
            }
        } catch (e: Exception) {
            logger.error("清理旧日志失败: ${e.message}", e)
        }
    }
}
