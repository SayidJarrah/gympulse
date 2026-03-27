package com.gymflow.dto

import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

data class UserMembershipResponse(
    val id: UUID,
    val userId: UUID,
    val planId: UUID,
    val planName: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val status: String,
    val bookingsUsedThisMonth: Int,
    val maxBookingsPerMonth: Int,
    val createdAt: OffsetDateTime
)
