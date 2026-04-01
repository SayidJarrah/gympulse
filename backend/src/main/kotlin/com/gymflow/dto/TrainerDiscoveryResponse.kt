package com.gymflow.dto

import java.util.UUID

data class TrainerDiscoveryResponse(
    val id: UUID,
    val firstName: String,
    val lastName: String,
    val profilePhotoUrl: String?,
    val specializations: List<String>,
    val experienceYears: Int?,
    val classCount: Int,
    val isFavorited: Boolean
)
