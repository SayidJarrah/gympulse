package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class BookingResponse(
    val id: UUID,
    val userId: UUID,
    val classId: UUID,
    val status: String,
    val bookedAt: OffsetDateTime,
    val cancelledAt: OffsetDateTime?,
    val className: String,
    val scheduledAt: OffsetDateTime,
    val durationMin: Int,
    val trainerNames: List<String>,
    val classPhotoUrl: String?,
    val isCancellable: Boolean,
    val cancellationCutoffAt: OffsetDateTime
)

data class ScheduleEntryBookingSummaryResponse(
    val id: UUID,
    val status: String,
    val bookedAt: OffsetDateTime
)
