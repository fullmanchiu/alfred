package com.colafan.alfred.controller

import com.colafan.alfred.config.FileUploadConfig
import com.colafan.alfred.entity.Activity
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.FitFileService
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.*

/**
 * 文件上传API控制器
 *
 * 端点说明：
 * - POST /api/v1/upload - 上传FIT文件并解析
 */
@RestController
@RequestMapping("/api/v1/upload")
class FileUploadController(
    private val fitFileService: FitFileService,
    private val authService: AuthService,
    private val fileUploadConfig: FileUploadConfig
) {
    private val logger = LoggerFactory.getLogger(FileUploadController::class.java)

    /**
     * 上传FIT文件并解析
     * POST /api/v1/upload
     *
     * @param files FIT文件列表（支持多文件）
     * @return 上传结果
     */
    @PostMapping("")
    fun uploadFitFiles(
        @RequestParam files: List<MultipartFile>,
        authentication: Authentication
    ): ResponseEntity<Map<String, Any?>> {
        val userId = authService.getCurrentUserId(authentication)

        if (files.isEmpty()) {
            return ResponseEntity.badRequest().body(mapOf(
                "success" to false,
                "message" to "未选择文件"
            ))
        }

        logger.info("收到 {} 个文件上传请求，用户ID: {}", files.size, userId)

        val createdActivities = mutableListOf<Map<String, Any?>>()

        for (file in files) {
            if (file.isEmpty) {
                logger.warn("跳过空文件: {}", file.originalFilename)
                continue
            }

            val originalFilename = file.originalFilename ?: "unknown.fit"

            // 验证文件类型
            if (!originalFilename.lowercase().endsWith(".fit")) {
                logger.warn("跳过非FIT文件: {}", originalFilename)
                return ResponseEntity.badRequest().body(mapOf(
                    "success" to false,
                    "message" to "$originalFilename 不是 FIT 文件"
                ))
            }

            try {
                // 创建用户目录结构: data/update/fit/{username}/{YYYY_MM_DD}/
                val username = "user_$userId"  // 简化处理，实际可以使用AuthService获取真实用户名
                val dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy_MM_dd"))
                val userDir: Path = fileUploadConfig.getBasePath()
                    .resolve(username)
                    .resolve(dateStr)

                Files.createDirectories(userDir)

                // 生成唯一文件名（避免重名）
                val fileExt = Paths.get(originalFilename).fileName.toString()
                val uniqueFilename = "${UUID.randomUUID().toString().replace("-", "")}_$fileExt"
                val targetPath: Path = userDir.resolve(uniqueFilename)

                // 保存文件
                Files.copy(
                    file.inputStream,
                    targetPath,
                    StandardCopyOption.REPLACE_EXISTING
                )

                logger.info("文件保存成功: {}", targetPath)

                // 解析FIT文件并保存到数据库
                val activity = fitFileService.parseAndSave(userId, targetPath.toFile(), originalFilename)

                createdActivities.add(mapOf(
                    "id" to activity.id!!,
                    "name" to activity.name,
                    "type" to activity.type,
                    "distance" to activity.distance,
                    "duration" to activity.duration
                ))

            } catch (e: Exception) {
                logger.error("处理文件失败: {}", originalFilename, e)
                return ResponseEntity.status(500).body(mapOf(
                    "success" to false,
                    "message" to "处理文件 $originalFilename 失败: ${e.message}"
                ))
            }
        }

        return ResponseEntity.ok(mapOf(
            "success" to true,
            "uploaded_count" to createdActivities.size,
            "activities" to createdActivities,
            "message" to "成功上传 ${createdActivities.size} 个文件"
        ))
    }
}
