package com.gymflow.dto

data class EmergencyContactInput(
    val name: String? = null,
    val phone: String? = null
)

data class UpdateUserProfileRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val phone: String? = null,
    val dateOfBirth: String? = null,
    val fitnessGoals: List<String>? = null,
    val preferredClassTypes: List<String>? = null,
    val emergencyContact: EmergencyContactInput? = null,
    // Read-only shadow fields — presence triggers READ_ONLY_FIELD error
    val email: String? = null,
    val userId: String? = null,
    val role: String? = null,
    val membershipStatus: String? = null
)
