package com.gymflow.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class RegisterRequest(
    @field:Email(message = "Invalid email format")
    @field:NotBlank
    val email: String,

    @field:Size(min = 8, max = 15, message = "Password must be between 8 and 15 characters")
    @field:NotBlank
    val password: String
)
