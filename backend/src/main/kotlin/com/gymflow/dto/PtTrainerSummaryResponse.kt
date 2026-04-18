package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class PtTrainerSummaryResponse(
    val id: UUID,
    val firstName: String,
    val lastName: String,
    val profilePhotoUrl: String?,
    val bio: String?,
    val specializations: List<String>,
    val experienceYears: Int?,
    val sessionsCompleted: Int,
    val accentColor: String?,
    val defaultRoom: String?,
    val nextOpenAt: OffsetDateTime?,
    val weekOpenCount: Int
)
