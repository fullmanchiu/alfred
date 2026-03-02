package com.colafan.alfred.converter

import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter

/**
 * JSONB 类型转换器
 *
 * 将 PostgreSQL 的 jsonb 类型与 Java String 类型进行转换
 */
@Converter
class JsonbConverter : AttributeConverter<String, String> {
    override fun convertToDatabaseColumn(attribute: String?): String? {
        return attribute
    }

    override fun convertToEntityAttribute(dbData: String?): String? {
        return dbData
    }
}
