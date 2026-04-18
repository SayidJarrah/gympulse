package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class PtBookingResponse(
    val id: UUID,
    val trainerId: UUID,
    val trainerName: String,
    val trainerAccentColor: String?,
    val memberId: UUID,
    val memberName: String,
    val startAt: OffsetDateTime,
    val endAt: OffsetDateTime,
    val room: String,
    val note: String?,
    val status: String,
    val cancelledAt: OffsetDateTime?,
    val createdAt: OffsetDateTime
)
