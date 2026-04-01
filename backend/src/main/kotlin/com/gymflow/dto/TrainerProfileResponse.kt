package com.gymflow.dto

import java.util.UUID

data class TrainerProfileResponse(
    val id: UUID,
    val firstName: String,
    val lastName: String,
    val profilePhotoUrl: String?,
    val bio: String?,
    val specializations: List<String>,
    val experienceYears: Int?,
    val classCount: Int,
    val isFavorited: Boolean,
    val availabilityPreview: Map<String, List<String>>
)
