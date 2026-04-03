package com.gymflow.dto

import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

data class UserClassScheduleEntryResponse(
    val id: UUID,
    val name: String,
    val scheduledAt: OffsetDateTime,
    val localDate: LocalDate,
    val durationMin: Int,
    val trainerNames: List<String>,
    val classPhotoUrl: String?
)

data class UserClassScheduleResponse(
    val view: String,
    val anchorDate: LocalDate,
    val timeZone: String,
    val week: String,
    val rangeStartDate: LocalDate,
    val rangeEndDateExclusive: LocalDate,
    val entries: List<UserClassScheduleEntryResponse>
)
