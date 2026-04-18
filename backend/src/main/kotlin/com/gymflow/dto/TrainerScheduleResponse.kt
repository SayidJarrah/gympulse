package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class TrainerScheduleResponse(
    val trainerId: UUID,
    val trainerName: String,
    val ptSessions: List<PtBookingResponse>,
    val groupClasses: List<TrainerSessionClassResponse>,
    val stats: TrainerSessionStats
)

data class TrainerSessionClassResponse(
    val id: UUID,
    val name: String,
    val scheduledAt: OffsetDateTime,
    val durationMin: Int,
    val room: String?,
    val type: String = "class"
)

data class TrainerSessionStats(
    val ptCount: Int,
    val classCount: Int,
    val total: Int
)
