package com.gymflow.dto

import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

data class MemberHomeClassPreviewItemResponse(
    val id: UUID,
    val name: String,
    val scheduledAt: OffsetDateTime,
    val localDate: LocalDate,
    val durationMin: Int,
    val trainerDisplayName: String,
    val classPhotoUrl: String?
)

data class MemberHomeClassPreviewResponse(
    val timeZone: String,
    val rangeStartDate: LocalDate,
    val rangeEndDateExclusive: LocalDate,
    val entries: List<MemberHomeClassPreviewItemResponse>
)
