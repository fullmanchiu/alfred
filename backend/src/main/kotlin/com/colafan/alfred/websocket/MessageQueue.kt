package com.colafan.alfred.websocket

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * WebSocket 消息队列
 * 连接断开时缓存消息，重连后发送
 *
 * 线程安全：使用 ConcurrentLinkedQueue，无需额外锁
 */
@Component
class MessageQueue {
    private val queue = ConcurrentLinkedQueue<QueuedMessage>()

    fun enqueue(message: QueuedMessage) {
        queue.offer(message)
    }

    fun dequeueAll(): List<QueuedMessage> {
        val messages = mutableListOf<QueuedMessage>()
        while (queue.isNotEmpty()) {
            queue.poll()?.let { messages.add(it) }
        }
        return messages
    }

    fun size(): Int = queue.size

    data class QueuedMessage(
        val message: String,
        val timestamp: Long = System.currentTimeMillis()
    )
}
