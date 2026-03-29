package com.gymflow.controller

import com.gymflow.dto.E2eCleanupRequest
import com.gymflow.dto.E2eCleanupResponse
import com.gymflow.service.E2eTestSupportService
import jakarta.validation.Valid
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/test-support")
@ConditionalOnProperty(prefix = "gymflow.test-support", name = ["enabled"], havingValue = "true")
@PreAuthorize("hasRole('ADMIN')")
class TestSupportController(
    private val e2eTestSupportService: E2eTestSupportService
) {

    @PostMapping("/e2e/cleanup")
    fun cleanupE2eData(
        @Valid @RequestBody request: E2eCleanupRequest
    ): ResponseEntity<E2eCleanupResponse> {
        val response = e2eTestSupportService.cleanupByPrefixes(
            emailPrefixes = request.emailPrefixes,
            planPrefixes = request.planPrefixes
        )
        return ResponseEntity.ok(response)
    }
}
