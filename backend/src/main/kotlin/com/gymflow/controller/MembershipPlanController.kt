package com.gymflow.controller

import com.gymflow.dto.MembershipPlanRequest
import com.gymflow.dto.MembershipPlanResponse
import com.gymflow.service.MembershipPlanService
import jakarta.validation.Valid
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/membership-plans")
class MembershipPlanController(
    private val membershipPlanService: MembershipPlanService
) {

    @GetMapping
    fun listActivePlans(
        @PageableDefault(size = 20, sort = ["createdAt"]) pageable: Pageable
    ): ResponseEntity<Page<MembershipPlanResponse>> {
        return ResponseEntity.ok(membershipPlanService.getActivePlans(pageable))
    }

    @GetMapping("/{id}")
    fun getPlanById(
        @PathVariable id: UUID,
        authentication: Authentication?
    ): ResponseEntity<MembershipPlanResponse> {
        val isAdmin = authentication?.authorities
            ?.any { it.authority == "ROLE_ADMIN" } == true
        return ResponseEntity.ok(membershipPlanService.getPlanById(id, isAdmin))
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    fun createPlan(
        @Valid @RequestBody request: MembershipPlanRequest
    ): ResponseEntity<MembershipPlanResponse> {
        val response = membershipPlanService.createPlan(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    fun updatePlan(
        @PathVariable id: UUID,
        @Valid @RequestBody request: MembershipPlanRequest
    ): ResponseEntity<MembershipPlanResponse> {
        return ResponseEntity.ok(membershipPlanService.updatePlan(id, request))
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    fun deactivatePlan(@PathVariable id: UUID): ResponseEntity<MembershipPlanResponse> {
        return ResponseEntity.ok(membershipPlanService.deactivatePlan(id))
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    fun activatePlan(@PathVariable id: UUID): ResponseEntity<MembershipPlanResponse> {
        return ResponseEntity.ok(membershipPlanService.activatePlan(id))
    }
}
