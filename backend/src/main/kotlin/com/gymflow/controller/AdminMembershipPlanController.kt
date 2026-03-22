package com.gymflow.controller

import com.gymflow.dto.MembershipPlanResponse
import com.gymflow.service.MembershipPlanService
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/admin/membership-plans")
@PreAuthorize("hasRole('ADMIN')")
class AdminMembershipPlanController(
    private val membershipPlanService: MembershipPlanService
) {

    @GetMapping
    fun listAllPlans(
        @RequestParam(required = false) status: String?,
        @PageableDefault(size = 20, sort = ["createdAt"]) pageable: Pageable
    ): ResponseEntity<Page<MembershipPlanResponse>> {
        return ResponseEntity.ok(membershipPlanService.getAllPlans(status, pageable))
    }
}
