package com.colafan.alfred.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Configuration
import java.nio.file.Path
import java.nio.file.Paths

/**
 * 文件上传配置
 */
@Configuration
@ConfigurationProperties(prefix = "file.upload")
class FileUploadConfig {
    var baseDir: String = "data/update/fit"

    /**
     * 获取基础目录的Path对象
     */
    fun getBasePath(): Path {
        return Paths.get(baseDir).toAbsolutePath().normalize()
    }
}
