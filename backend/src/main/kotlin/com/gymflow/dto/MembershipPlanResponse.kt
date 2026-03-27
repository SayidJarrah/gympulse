package com.gymflow.dto

import java.time.OffsetDateTime
import java.util.UUID

data class MembershipPlanResponse(
    val id: UUID,
    val name: String,
    val description: String,
    val priceInCents: Int,
    val durationDays: Int,
    val maxBookingsPerMonth: Int,
    val status: String,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime
)
