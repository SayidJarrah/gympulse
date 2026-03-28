package com.gymflow.dto

import java.util.UUID

data class TrainerSummaryResponse(
    val id: UUID,
    val firstName: String,
    val lastName: String
)
