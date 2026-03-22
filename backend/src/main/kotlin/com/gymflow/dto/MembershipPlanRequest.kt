package com.gymflow.dto

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull

data class MembershipPlanRequest(
    @field:NotBlank(message = "Name must not be blank")
    val name: String?,

    @field:NotBlank(message = "Description must not be blank")
    val description: String?,

    @field:NotNull(message = "Price is required")
    @field:Min(value = 1, message = "Price must be greater than zero")
    val priceInCents: Int?,

    @field:NotNull(message = "Duration is required")
    @field:Min(value = 1, message = "Duration must be greater than zero")
    val durationDays: Int?
)
