package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class TrainerResponse(
    val id: UUID,
    val firstName: String,
    val lastName: String,
    val email: String,
    val phone: String?,
    val bio: String?,
    val specialisations: List<String>,
    val hasPhoto: Boolean,
    val photoUrl: String?,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime
)
