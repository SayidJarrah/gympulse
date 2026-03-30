package com.gymflow.controller

import com.gymflow.dto.UpdateUserProfileRequest
import com.gymflow.dto.UserProfileResponse
import com.gymflow.service.UserProfileService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/profile")
class UserProfileController(
    private val userProfileService: UserProfileService
) {

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER')")
    fun getMyProfile(authentication: Authentication): ResponseEntity<UserProfileResponse> {
        val userId = UUID.fromString(authentication.name)
        val response = userProfileService.getMyProfile(userId)
        return ResponseEntity.ok(response)
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('USER')")
    fun updateMyProfile(
        @Valid @RequestBody request: UpdateUserProfileRequest,
        authentication: Authentication
    ): ResponseEntity<UserProfileResponse> {
        val userId = UUID.fromString(authentication.name)
        val response = userProfileService.updateMyProfile(userId, request)
        return ResponseEntity.ok(response)
    }
}
