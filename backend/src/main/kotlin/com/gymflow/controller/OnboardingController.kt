package com.gymflow.controller

import com.gymflow.dto.OnboardingCompleteResponse
import com.gymflow.dto.OnboardingPlanPendingRequest
import com.gymflow.dto.OnboardingPlanPendingResponse
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

    @PostMapping("/plan-pending")
    @PreAuthorize("hasRole('USER')")
    fun createPlanPending(
        authentication: Authentication,
        @Valid @RequestBody request: OnboardingPlanPendingRequest,
    ): ResponseEntity<OnboardingPlanPendingResponse> {
        val userId = UUID.fromString(authentication.name)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(onboardingService.createPlanPending(userId, request.planId))
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
