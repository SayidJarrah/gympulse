package com.gymflow.dto

import java.time.LocalDate
import java.util.UUID

data class TrainerAvailabilityResponse(
    val trainerId: UUID,
    val days: List<DayAvailability>
)

data class DayAvailability(
    val date: LocalDate,
    val open: Int,
    val close: Int,
    val slots: Map<Int, String>   // hour (0–23) → "available" | "class" | "booked" | "past"
)
