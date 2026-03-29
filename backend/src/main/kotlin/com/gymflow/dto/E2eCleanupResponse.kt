package com.gymflow.dto

data class E2eCleanupResponse(
    val deletedUsers: Int,
    val deletedMemberships: Int,
    val deletedPlans: Int
)
