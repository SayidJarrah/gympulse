package com.gymflow.dto

import jakarta.validation.constraints.AssertTrue
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size

/**
 * Combined-payload register request.
 *
 * Submitted from the unified onboarding wizard at `terms`-step submission.
 * Creates the `users` row, the `user_profiles` row (with mandatory profile
 * fields populated), and the `refresh_tokens` row in a single transaction.
 *
 * `agreeTerms` and `agreeWaiver` are validated only — they are not persisted
 * (no consent table; SDD §6 Decision 3).
 */
data class RegisterRequest(
    @field:Email(message = "Invalid email format")
    @field:NotBlank
    @field:Size(max = 255)
    val email: String,

    @field:Size(min = 8, max = 15, message = "Password must be between 8 and 15 characters")
    @field:NotBlank
    val password: String,

    @field:NotBlank(message = "First name is required")
    @field:Size(max = 50, message = "First name must be 50 characters or fewer")
    val firstName: String,

    @field:NotBlank(message = "Last name is required")
    @field:Size(max = 50, message = "Last name must be 50 characters or fewer")
    val lastName: String,

    @field:NotBlank(message = "Phone is required")
    @field:Size(max = 20, message = "Phone must be 20 characters or fewer")
    val phone: String,

    @field:NotBlank(message = "Date of birth is required")
    val dateOfBirth: String,  // ISO-8601 yyyy-MM-dd; parsed and validated in service

    @field:NotNull
    @field:AssertTrue(message = "You must agree to the terms of use")
    val agreeTerms: Boolean,

    @field:NotNull
    @field:AssertTrue(message = "You must acknowledge the health and liability waiver")
    val agreeWaiver: Boolean,
)
