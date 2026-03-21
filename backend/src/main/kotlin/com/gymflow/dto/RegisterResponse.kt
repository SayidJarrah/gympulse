package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class RegisterResponse(
    val id: UUID,
    val email: String,
    val role: String,
    val createdAt: OffsetDateTime
)
