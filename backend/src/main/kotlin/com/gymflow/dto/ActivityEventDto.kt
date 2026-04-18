package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class ActivityEventDto(
    val id: UUID,
    val kind: String,
    val actor: String,
    val text: String,
    val at: OffsetDateTime
)
