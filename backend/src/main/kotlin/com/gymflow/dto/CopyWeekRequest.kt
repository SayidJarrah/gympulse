package com.gymflow.dto

import jakarta.validation.constraints.NotBlank

data class CopyWeekRequest(
    @field:NotBlank(message = "Source week is required")
    val sourceWeek: String?
)
