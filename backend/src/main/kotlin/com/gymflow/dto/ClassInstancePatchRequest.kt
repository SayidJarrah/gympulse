package com.gymflow.dto

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import java.time.OffsetDateTime
import java.util.UUID

data class ClassInstancePatchRequest(
    val scheduledAt: OffsetDateTime? = null,

    @field:Min(value = 15, message = "Duration must be between 15 and 240 minutes")
    @field:Max(value = 240, message = "Duration must be between 15 and 240 minutes")
    val durationMin: Int? = null,

    @field:Min(value = 1, message = "Capacity must be between 1 and 500")
    @field:Max(value = 500, message = "Capacity must be between 1 and 500")
    val capacity: Int? = null,

    val roomId: UUID? = null,

    val trainerIds: List<UUID>? = null
)
