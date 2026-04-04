package com.gymflow.dto

import java.util.UUID

data class AdminBookingMemberSummaryResponse(
    val id: UUID,
    val email: String,
    val firstName: String?,
    val lastName: String?,
    val displayName: String,
    val hasActiveMembership: Boolean
)
