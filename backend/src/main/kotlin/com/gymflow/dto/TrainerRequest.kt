package com.gymflow.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class TrainerRequest(
    @field:NotBlank(message = "First name is required")
    @field:Size(max = 100, message = "First name must be 100 characters or fewer")
    val firstName: String?,

    @field:NotBlank(message = "Last name is required")
    @field:Size(max = 100, message = "Last name must be 100 characters or fewer")
    val lastName: String?,

    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Invalid email format")
    val email: String?,

    @field:Size(max = 30, message = "Phone must be 30 characters or fewer")
    val phone: String? = null,

    @field:Size(max = 1000, message = "Bio must be 1000 characters or fewer")
    val bio: String? = null,

    @field:Size(max = 10, message = "Maximum 10 specialisations")
    val specialisations: List<@Size(max = 50, message = "Each tag must be 50 characters or fewer") String>? = null,

    val experienceYears: Int? = null,

    val profilePhotoUrl: String? = null
)
