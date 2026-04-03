package com.gymflow.dto

import java.util.UUID

data class TrainerFavoriteResponse(
    val trainerId: UUID,
    val firstName: String,
    val lastName: String
)
