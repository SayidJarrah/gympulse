package com.gymflow.dto

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.util.UUID

data class ClassTemplateRequest(
    @field:NotBlank(message = "Name is required")
    @field:Size(max = 100, message = "Name must be 100 characters or fewer")
    val name: String?,

    @field:Size(max = 500, message = "Description must be 500 characters or fewer")
    val description: String? = null,

    @field:NotBlank(message = "Category is required")
    @field:Pattern(
        regexp = "^(Cardio|Strength|Flexibility|Mind & Body|Cycling|Combat|Dance|Functional|Aqua|Wellness|Other)$",
        message = "Invalid category"
    )
    val category: String?,

    @field:NotNull(message = "Default duration is required")
    @field:Min(value = 15, message = "Duration must be between 15 and 240 minutes")
    @field:Max(value = 240, message = "Duration must be between 15 and 240 minutes")
    val defaultDurationMin: Int?,

    @field:NotNull(message = "Default capacity is required")
    @field:Min(value = 1, message = "Capacity must be between 1 and 500")
    @field:Max(value = 500, message = "Capacity must be between 1 and 500")
    val defaultCapacity: Int?,

    @field:NotBlank(message = "Difficulty is required")
    @field:Pattern(
        regexp = "^(Beginner|Intermediate|Advanced|All Levels)$",
        message = "Invalid difficulty"
    )
    val difficulty: String?,

    val roomId: UUID? = null
)
