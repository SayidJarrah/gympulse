package com.gymflow.controller

import com.gymflow.dto.OnboardingCompleteResponse
import com.gymflow.dto.OnboardingMembershipRequest
import com.gymflow.dto.OnboardingMembershipResponse
import com.gymflow.service.OnboardingService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/onboarding")
class OnboardingController(
    private val onboardingService: OnboardingService
) {

    @PostMapping("/membership")
    @PreAuthorize("hasRole('USER')")
    fun createMembership(
        authentication: Authentication,
        @Valid @RequestBody request: OnboardingMembershipRequest,
    ): ResponseEntity<OnboardingMembershipResponse> {
        val userId = UUID.fromString(authentication.name)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(onboardingService.createMembership(userId, request.planId))
    }

    @PostMapping("/complete")
    @PreAuthorize("hasRole('USER')")
    fun completeOnboarding(
        authentication: Authentication,
    ): ResponseEntity<OnboardingCompleteResponse> {
        val userId = UUID.fromString(authentication.name)
        return ResponseEntity.ok(onboardingService.completeOnboarding(userId))
    }
}
