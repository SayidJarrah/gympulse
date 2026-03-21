package com.gymflow.dto

import com.fasterxml.jackson.annotation.JsonProperty
import jakarta.validation.constraints.NotBlank

data class LogoutRequest(
    @field:NotBlank
    @JsonProperty("refreshToken")
    val refreshToken: String
)
