package com.gymflow.dto

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class RoomRequest(
    @field:NotBlank(message = "Name is required")
    @field:Size(max = 100, message = "Name must be 100 characters or fewer")
    val name: String?,

    @field:Min(value = 1, message = "Capacity must be at least 1")
    val capacity: Int? = null,

    @field:Size(max = 500, message = "Description must be 500 characters or fewer")
    val description: String? = null
)
