package com.gymflow.dto

data class LoginResponse(
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long,  // seconds
    val hasActiveMembership: Boolean = false
)
