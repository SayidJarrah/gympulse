package com.gymflow.dto

data class UpdateUserProfileRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val phone: String? = null,
    val dateOfBirth: String? = null,
    val fitnessGoals: List<String>? = null,
    val preferredClassTypes: List<String>? = null,
    val email: String? = null,
    val userId: String? = null,
    val role: String? = null,
    val membershipStatus: String? = null
)
