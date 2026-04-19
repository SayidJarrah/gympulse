package com.gymflow.dto

import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

data class EmergencyContactDto(
    val name: String,
    val phone: String
)

data class UserProfileResponse(
    val userId: UUID,
    val email: String,
    val firstName: String?,
    val lastName: String?,
    val phone: String?,
    val dateOfBirth: LocalDate?,
    val fitnessGoals: List<String>,
    val preferredClassTypes: List<String>,
    val emergencyContact: EmergencyContactDto?,
    val hasProfilePhoto: Boolean,
    val profilePhotoUrl: String?,
    val onboardingCompletedAt: OffsetDateTime?,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime
)
