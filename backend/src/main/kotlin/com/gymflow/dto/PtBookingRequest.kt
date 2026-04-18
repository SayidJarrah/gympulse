package com.gymflow.dto

import jakarta.validation.constraints.NotNull
import java.time.OffsetDateTime
import java.util.UUID

data class PtBookingRequest(
    @field:NotNull(message = "trainerId is required")
    val trainerId: UUID?,

    @field:NotNull(message = "startAt is required")
    val startAt: OffsetDateTime?
)
