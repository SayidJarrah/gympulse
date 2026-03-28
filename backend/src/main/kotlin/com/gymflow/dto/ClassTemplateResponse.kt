package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class ClassTemplateResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val category: String,
    val defaultDurationMin: Int,
    val defaultCapacity: Int,
    val difficulty: String,
    val room: RoomSummaryResponse?,
    val isSeeded: Boolean,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime
)
