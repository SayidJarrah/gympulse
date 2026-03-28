package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class RoomResponse(
    val id: UUID,
    val name: String,
    val capacity: Int?,
    val description: String?,
    val createdAt: OffsetDateTime
)
