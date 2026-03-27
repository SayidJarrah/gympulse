package com.gymflow.controller

import com.gymflow.dto.MembershipPurchaseRequest
import com.gymflow.dto.UserMembershipResponse
import com.gymflow.service.UserMembershipService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/memberships")
class UserMembershipController(
    private val userMembershipService: UserMembershipService
) {

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    fun purchaseMembership(
        @Valid @RequestBody request: MembershipPurchaseRequest,
        authentication: Authentication
    ): ResponseEntity<UserMembershipResponse> {
        val userId = UUID.fromString(authentication.name)
        val response = userMembershipService.purchaseMembership(userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER')")
    fun getMyActiveMembership(authentication: Authentication): ResponseEntity<UserMembershipResponse> {
        val userId = UUID.fromString(authentication.name)
        val response = userMembershipService.getMyActiveMembership(userId)
        return ResponseEntity.ok(response)
    }

    @DeleteMapping("/me")
    @PreAuthorize("hasRole('USER')")
    fun cancelMyMembership(authentication: Authentication): ResponseEntity<UserMembershipResponse> {
        val userId = UUID.fromString(authentication.name)
        val response = userMembershipService.cancelMyMembership(userId)
        return ResponseEntity.ok(response)
    }
}
