package com.colafan.alfred.dto.request

data class CategoryRequest(
    val name: String? = null,
    val type: String? = null,
    val parentId: Long? = null,
    val icon: String? = null,
    val color: String? = null,
    val sortOrder: Int? = null
)
