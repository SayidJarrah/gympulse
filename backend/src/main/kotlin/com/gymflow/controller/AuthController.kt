package com.gymflow.controller

import com.gymflow.dto.LoginRequest
import com.gymflow.dto.LoginResponse
import com.gymflow.dto.LogoutRequest
import com.gymflow.dto.RefreshRequest
import com.gymflow.dto.RegisterRequest
import com.gymflow.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<LoginResponse> {
        val response = authService.register(request.email, request.password)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<LoginResponse> {
        val response = authService.login(request.email, request.password)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/refresh")
    fun refresh(@Valid @RequestBody request: RefreshRequest): ResponseEntity<LoginResponse> {
        val response = authService.refresh(request.refreshToken)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/logout")
    fun logout(@Valid @RequestBody request: LogoutRequest): ResponseEntity<Void> {
        authService.logout(request.refreshToken)
        return ResponseEntity.noContent().build()
    }
}
