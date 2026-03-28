package com.gymflow.dto

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.OffsetDateTime
import java.util.UUID

data class ClassInstanceRequest(
    val templateId: UUID? = null,

    @field:NotBlank(message = "Name is required")
    val name: String?,

    @field:NotNull(message = "Scheduled time is required")
    val scheduledAt: OffsetDateTime?,

    @field:NotNull(message = "Duration is required")
    @field:Min(value = 15, message = "Duration must be between 15 and 240 minutes")
    @field:Max(value = 240, message = "Duration must be between 15 and 240 minutes")
    val durationMin: Int?,

    @field:NotNull(message = "Capacity is required")
    @field:Min(value = 1, message = "Capacity must be between 1 and 500")
    @field:Max(value = 500, message = "Capacity must be between 1 and 500")
    val capacity: Int?,

    val roomId: UUID? = null,

    @field:NotNull(message = "Trainer list is required")
    val trainerIds: List<UUID>?
)
