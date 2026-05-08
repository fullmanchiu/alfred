package com.colafan.alfred.repository.ai

import com.colafan.alfred.entity.ai.AiMessage
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AiMessageRepository : JpaRepository<AiMessage, Long> {

    fun findByConversationIdOrderByCreatedAtAsc(conversationId: Long): List<AiMessage>
}
