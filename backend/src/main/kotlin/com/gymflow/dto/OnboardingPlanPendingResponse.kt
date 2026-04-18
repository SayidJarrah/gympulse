package com.gymflow.dto

import java.util.UUID

data class OnboardingPlanPendingResponse(
    val membershipId: UUID,
    val planId: UUID,
    val planName: String,
    val status: String
)
