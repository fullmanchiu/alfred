package com.colafan.alfred.repository.ai

import com.colafan.alfred.entity.ai.AiConversation
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AiConversationRepository : JpaRepository<AiConversation, Long> {

    fun findByUserIdOrderByUpdatedAtDesc(userId: Long): List<AiConversation>

    fun findByIdAndUserId(id: Long, userId: Long): AiConversation?
}
