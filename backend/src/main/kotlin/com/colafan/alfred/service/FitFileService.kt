package com.colafan.alfred.service

import com.colafan.alfred.entity.Activity
import com.colafan.alfred.entity.ActivityLap
import com.colafan.alfred.entity.ActivityPoint
import com.colafan.alfred.repository.ActivityLapRepository
import com.colafan.alfred.repository.ActivityPointRepository
import com.colafan.alfred.repository.ActivityRepository
import com.garmin.fit.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.File
import java.io.FileInputStream
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * FIT文件解析服务
 * 使用Garmin FIT SDK解析.fit文件并存储到数据库
 */
@Service
class FitFileService(
    private val activityRepository: ActivityRepository,
    private val activityPointRepository: ActivityPointRepository,
    private val activityLapRepository: ActivityLapRepository
) {
    private val logger = LoggerFactory.getLogger(FitFileService::class.java)

    /**
     * 解析FIT文件并保存到数据库
     * @param userId 用户ID
     * @param fitFile FIT文件
     * @param fileName 原始文件名
     * @return 创建的Activity
     */
    @Transactional
    fun parseAndSave(userId: Long, fitFile: File, fileName: String): Activity {
        logger.info("开始解析FIT文件: {}, 用户ID: {}", fileName, userId)

        try {
            val decode = Decode()
            val listener = FitFileListener()
            val mesgBroadcaster = MesgBroadcaster()

            mesgBroadcaster.addListener(listener)

            FileInputStream(fitFile).use { fis ->
                if (!decode.read(fis, mesgBroadcaster)) {
                    throw IllegalArgumentException("无法解析FIT文件")
                }
            }

            val records = listener.getRecords()
            val laps = listener.getLaps()
            val session = listener.getSession()

            if (records.isEmpty() && session == null) {
                throw IllegalArgumentException("FIT文件中没有有效的运动数据")
            }

            // 创建Activity记录
            val activity = createActivity(userId, fileName, session, records)
            val savedActivity = activityRepository.save(activity)
            logger.info("创建运动记录: ID={}, 类型={}, 距离={}m",
                savedActivity.id, savedActivity.type, savedActivity.distance)

            // 批量保存轨迹点
            if (records.isNotEmpty()) {
                val points = records.mapNotNull { record ->
                    if (record.getTimestamp() != null || record.getPositionLat() != null) {
                        ActivityPoint(
                            activityId = savedActivity.id!!,
                            time = record.getTimestamp()?.toLocalDateTime(),
                            latitude = record.getPositionLat()?.toDouble(),
                            longitude = record.getPositionLong()?.toDouble(),
                            elevation = record.getAltitude()?.toFloat(),
                            speed = record.getSpeed()?.toFloat(),
                            heartRate = record.getHeartRate()?.toInt(),
                            power = record.getPower()?.toInt(),
                            cadence = record.getCadence()?.toInt()
                        )
                    } else null
                }
                if (points.isNotEmpty()) {
                    activityPointRepository.saveAll(points)
                    logger.info("保存了 {} 个轨迹点", points.size)
                }
            }

            // 批量保存分段数据
            if (laps.isNotEmpty()) {
                val activityLaps = laps.mapIndexed { index, lap ->
                    ActivityLap(
                        activityId = savedActivity.id!!,
                        lapIndex = index + 1,
                        startTime = lap.getStartTime()?.toLocalDateTime(),
                        elapsedTime = lap.getTotalElapsedTime()?.toInt(),
                        distance = lap.getTotalDistance()?.toInt(),
                        avgHeartRate = lap.getAvgHeartRate()?.toInt(),
                        avgPower = lap.getAvgPower()?.toInt(),
                        avgSpeed = lap.getAvgSpeed()?.toFloat()
                    )
                }
                activityLapRepository.saveAll(activityLaps)
                logger.info("保存了 {} 个分段", activityLaps.size)
            }

            return savedActivity

        } catch (e: Exception) {
            logger.error("解析FIT文件失败: {}", fileName, e)
            throw IllegalArgumentException("解析FIT文件失败: ${e.message}", e)
        }
    }

    /**
     * 从数据创建Activity记录
     */
    private fun createActivity(
        userId: Long,
        fileName: String,
        session: SessionMesg?,
        records: List<RecordMesg>
    ): Activity {
        // 优先使用Session数据，否则从Records计算
        val sport = session?.getSport()?.name?.lowercase() ?: "unknown"

        val distance = session?.getTotalDistance()?.toInt()
            ?: records.lastOrNull()?.getDistance()?.toInt()

        // 计算时长
        val duration = session?.getTotalTimerTime()?.toInt()
            ?: if (records.isNotEmpty() && records.first().getTimestamp() != null && records.last().getTimestamp() != null) {
                val startMs = records.first().getTimestamp()!!.getDate().time
                val endMs = records.last().getTimestamp()!!.getDate().time
                ((endMs - startMs) / 1000).toInt()
            } else null

        // 计算速度
        val speeds = records.mapNotNull { it.getSpeed()?.toFloat() }
        val avgSpeed = if (speeds.isNotEmpty()) speeds.average().toFloat() else null
        val maxSpeed = speeds.maxOrNull()

        // 计算海拔
        val elevations = records.mapNotNull { it.getAltitude()?.toDouble() }
        val totalElevation = if (elevations.size >= 2) {
            (elevations.maxOrNull()!! - elevations.minOrNull()!!).toInt()
        } else null

        // 心率
        val heartRates = records.mapNotNull { it.getHeartRate()?.toInt() }
        val avgHeartRate = if (heartRates.isNotEmpty()) heartRates.average().toInt() else null
        val maxHeartRate = heartRates.maxOrNull()

        // 功率
        val powers = records.mapNotNull { it.getPower()?.toInt() }
        val avgPower = if (powers.isNotEmpty()) powers.average().toInt() else null
        val maxPower = powers.maxOrNull()

        // 踏频
        val cadences = records.mapNotNull { it.getCadence()?.toInt() }
        val avgCadence = if (cadences.isNotEmpty()) cadences.average().toInt() else null

        // 时间范围
        val startTime = session?.getStartTime()?.toLocalDateTime()
            ?: records.firstOrNull()?.getTimestamp()?.toLocalDateTime()
        val endTime = records.lastOrNull()?.getTimestamp()?.toLocalDateTime()

        return Activity(
            userId = userId,
            name = fileName,
            type = sport,
            distance = distance,
            duration = duration,
            avgSpeed = avgSpeed,
            maxSpeed = maxSpeed,
            totalElevation = totalElevation,
            avgHeartRate = avgHeartRate,
            maxHeartRate = maxHeartRate,
            avgPower = avgPower,
            maxPower = maxPower,
            avgCadence = avgCadence,
            calories = session?.getTotalCalories()?.toInt(),
            startTime = startTime,
            endTime = endTime
        )
    }

    /**
     * FIT文件监听器
     */
    private class FitFileListener : MesgListener {
        private val records = mutableListOf<RecordMesg>()
        private val laps = mutableListOf<LapMesg>()
        private var session: SessionMesg? = null

        fun getRecords() = records
        fun getLaps() = laps
        fun getSession() = session

        override fun onMesg(mesg: Mesg) {
            when (mesg.getNum()) {
                MesgNum.RECORD -> {
                    val recordMesg = RecordMesg(mesg)
                    if (recordMesg.getTimestamp() != null || recordMesg.getPositionLat() != null) {
                        records.add(recordMesg)
                    }
                }
                MesgNum.LAP -> {
                    laps.add(LapMesg(mesg))
                }
                MesgNum.SESSION -> {
                    session = SessionMesg(mesg)
                }
            }
        }
    }

    /**
     * DateTime转LocalDateTime
     */
    private fun DateTime.toLocalDateTime(): LocalDateTime {
        return LocalDateTime.ofInstant(
            Instant.ofEpochSecond(this.getDate().time / 1000),
            ZoneId.systemDefault()
        )
    }
}
