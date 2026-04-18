package com.gymflow.dto

import org.springframework.data.domain.Page
import java.time.OffsetDateTime
import java.util.UUID

data class AdminAttendeeItemResponse(
    val bookingId: UUID,
    val memberId: UUID,
    val displayName: String,
    val status: String,
    val bookedAt: OffsetDateTime
)

data class AdminAttendeeListResponse(
    val classInstanceId: UUID,
    val className: String,
    val scheduledAt: OffsetDateTime,
    val capacity: Int,
    val confirmedCount: Long,
    val attendees: Page<AdminAttendeeItemResponse>
)
