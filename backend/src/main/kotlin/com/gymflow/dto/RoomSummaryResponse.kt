package com.gymflow.dto

import java.util.UUID

data class RoomSummaryResponse(
    val id: UUID,
    val name: String,
    val photoUrl: String?
)
