package com.gymflow.dto

data class LandingActivityResponse(
    val variant: String,
    val events: List<ActivityEventDto>
)
