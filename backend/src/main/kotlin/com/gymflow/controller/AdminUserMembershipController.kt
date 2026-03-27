package com.gymflow.controller

import com.gymflow.dto.UserMembershipResponse
import com.gymflow.service.UserMembershipService
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.web.PageableDefault
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/admin/memberships")
@PreAuthorize("hasRole('ADMIN')")
class AdminUserMembershipController(
    private val userMembershipService: UserMembershipService
) {

    @GetMapping
    fun listAllMemberships(
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) userId: UUID?,
        @PageableDefault(size = 20, sort = ["createdAt"], direction = Sort.Direction.DESC) pageable: Pageable
    ): ResponseEntity<Page<UserMembershipResponse>> {
        return ResponseEntity.ok(userMembershipService.getAllMemberships(status, userId, pageable))
    }

    @DeleteMapping("/{membershipId}")
    fun cancelMembership(
        @PathVariable membershipId: UUID
    ): ResponseEntity<UserMembershipResponse> {
        val response = userMembershipService.adminCancelMembership(membershipId)
        return ResponseEntity.ok(response)
    }
}
