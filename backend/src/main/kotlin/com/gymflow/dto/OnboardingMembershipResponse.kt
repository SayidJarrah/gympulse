package com.gymflow.dto

import java.util.UUID

data class OnboardingMembershipResponse(
    val membershipId: UUID,
    val planId: UUID,
    val planName: String,
    val status: String
)
