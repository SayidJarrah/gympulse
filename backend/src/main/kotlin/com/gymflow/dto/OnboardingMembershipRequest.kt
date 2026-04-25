package com.gymflow.dto

import jakarta.validation.constraints.NotNull
import java.util.UUID

data class OnboardingMembershipRequest(
    @field:NotNull val planId: UUID
)
