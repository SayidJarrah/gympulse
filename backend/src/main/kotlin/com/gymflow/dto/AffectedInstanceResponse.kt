package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class AffectedInstanceResponse(
    val id: UUID,
    val name: String,
    val scheduledAt: OffsetDateTime
)
