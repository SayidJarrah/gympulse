package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class AdminUserBookingHistoryItemResponse(
    val bookingId: UUID,
    val classInstanceId: UUID,
    val className: String,
    val scheduledAt: OffsetDateTime,
    val status: String,
    val bookedAt: OffsetDateTime,
    val cancelledAt: OffsetDateTime?
)
