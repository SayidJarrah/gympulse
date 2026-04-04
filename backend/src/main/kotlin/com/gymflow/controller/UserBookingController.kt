package com.gymflow.controller

import com.gymflow.dto.BookingRequest
import com.gymflow.dto.BookingResponse
import com.gymflow.service.BookingService
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
@RequestMapping("/api/v1/bookings")
class UserBookingController(
    private val bookingService: BookingService
) {

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    fun createBooking(
        @Valid @RequestBody request: BookingRequest,
        authentication: Authentication
    ): ResponseEntity<BookingResponse> {
        val userId = UUID.fromString(authentication.name)
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.createBooking(userId, request))
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER')")
    fun getMyBookings(
        @RequestParam("status", required = false) status: String?,
        @PageableDefault(size = 20) pageable: Pageable,
        authentication: Authentication
    ): ResponseEntity<Page<BookingResponse>> {
        val userId = UUID.fromString(authentication.name)
        return ResponseEntity.ok(bookingService.getMyBookings(userId, status, pageable))
    }

    @DeleteMapping("/{bookingId}")
    @PreAuthorize("hasRole('USER')")
    fun cancelBooking(
        @PathVariable bookingId: UUID,
        authentication: Authentication
    ): ResponseEntity<BookingResponse> {
        val userId = UUID.fromString(authentication.name)
        return ResponseEntity.ok(bookingService.cancelBooking(userId, bookingId))
    }
}
