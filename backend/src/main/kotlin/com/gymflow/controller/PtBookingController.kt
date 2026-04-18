package com.gymflow.controller

import com.gymflow.dto.PtBookingRequest
import com.gymflow.dto.PtBookingResponse
import com.gymflow.service.PtBookingService
import jakarta.validation.Valid
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/pt-bookings")
class PtBookingController(
    private val ptBookingService: PtBookingService
) {

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    fun createBooking(
        @Valid @RequestBody request: PtBookingRequest,
        authentication: Authentication
    ): ResponseEntity<PtBookingResponse> {
        val memberId = UUID.fromString(authentication.name)
        val response = ptBookingService.createBooking(memberId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER')")
    fun getMyBookings(
        @RequestParam("status", required = false) status: String?,
        @PageableDefault(size = 20) pageable: Pageable,
        authentication: Authentication
    ): ResponseEntity<Page<PtBookingResponse>> {
        val memberId = UUID.fromString(authentication.name)
        return ResponseEntity.ok(ptBookingService.getMyBookings(memberId, status, pageable))
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    fun cancelBooking(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<PtBookingResponse> {
        val memberId = UUID.fromString(authentication.name)
        return ResponseEntity.ok(ptBookingService.cancelBooking(memberId, id))
    }
}
