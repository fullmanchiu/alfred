package com.colafan.alfred.entity.ai

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "ai_conversations")
data class AiConversation(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(length = 200)
    var title: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime? = null,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime? = null,

    @OneToMany(mappedBy = "conversation", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val messages: MutableList<AiMessage> = mutableListOf()
) {
    @PrePersist
    fun prePersist() {
        val now = LocalDateTime.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun preUpdate() {
        updatedAt = LocalDateTime.now()
    }

    fun addMessage(message: AiMessage) {
        messages.add(message)
        preUpdate()
    }
}
