package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class ClassInstanceResponse(
    val id: UUID,
    val templateId: UUID?,
    val name: String,
    val type: String,
    val scheduledAt: OffsetDateTime,
    val durationMin: Int,
    val capacity: Int,
    val room: RoomSummaryResponse?,
    val trainers: List<TrainerSummaryResponse>,
    val hasRoomConflict: Boolean,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime
)
