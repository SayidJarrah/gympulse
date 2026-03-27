package com.gymflow.dto

import jakarta.validation.constraints.NotNull
import java.util.UUID

data class MembershipPurchaseRequest(
    @field:NotNull(message = "Plan ID is required")
    val planId: UUID?
)
