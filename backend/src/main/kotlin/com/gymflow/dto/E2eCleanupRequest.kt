package com.gymflow.dto

import jakarta.validation.constraints.NotEmpty

data class E2eCleanupRequest(
    @field:NotEmpty
    val emailPrefixes: List<String>,
    val planPrefixes: List<String> = emptyList()
)
