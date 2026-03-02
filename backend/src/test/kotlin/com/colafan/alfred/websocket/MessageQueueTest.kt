package com.colafan.alfred.websocket

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeEach
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * 消息队列测试
 */
class MessageQueueTest {

    private lateinit var messageQueue: MessageQueue

    @BeforeEach
    fun setup() {
        messageQueue = MessageQueue()
    }

    @Test
    fun `should enqueue message correctly`() {
        val queuedMessage = MessageQueue.QueuedMessage(
            message = """{"type":"request","payload":{"test":"data"}}""",
            timestamp = System.currentTimeMillis()
        )

        messageQueue.enqueue(queuedMessage)

        assertEquals(1, messageQueue.size())
    }

    @Test
    fun `should dequeue all messages correctly`() {
        val message1 = MessageQueue.QueuedMessage("message1")
        val message2 = MessageQueue.QueuedMessage("message2")
        val message3 = MessageQueue.QueuedMessage("message3")

        messageQueue.enqueue(message1)
        messageQueue.enqueue(message2)
        messageQueue.enqueue(message3)

        val messages = messageQueue.dequeueAll()

        assertEquals(3, messages.size)
        assertEquals("message1", messages[0].message)
        assertEquals("message2", messages[1].message)
        assertEquals("message3", messages[2].message)
        assertEquals(0, messageQueue.size())
    }

    @Test
    fun `should handle empty queue correctly`() {
        val messages = messageQueue.dequeueAll()

        assertTrue(messages.isEmpty())
        assertEquals(0, messageQueue.size())
    }

    @Test
    fun `should maintain message order`() {
        val messages = (1..10).map { i ->
            MessageQueue.QueuedMessage("message$i")
        }

        messages.forEach { messageQueue.enqueue(it) }

        val dequeued = messageQueue.dequeueAll()

        assertEquals(10, dequeued.size)
        dequeued.forEachIndexed { index, msg ->
            assertEquals("message${index + 1}", msg.message)
        }
    }
}
