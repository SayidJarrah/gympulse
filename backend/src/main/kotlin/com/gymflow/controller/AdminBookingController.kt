package com.gymflow.controller

import com.gymflow.dto.AdminAttendeeListResponse
import com.gymflow.dto.AdminBookingMemberSummaryResponse
import com.gymflow.dto.AdminBookingRequest
import com.gymflow.dto.AdminUserBookingHistoryItemResponse
import com.gymflow.dto.BookingResponse
import com.gymflow.service.BookingService
import jakarta.validation.Valid
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
class AdminBookingController(
    private val bookingService: BookingService
) {

    @PostMapping("/bookings")
    fun createBooking(@Valid @RequestBody request: AdminBookingRequest): ResponseEntity<BookingResponse> {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.createBookingForUser(request))
    }

    @GetMapping("/booking-members")
    fun searchMembers(
        @RequestParam("query", required = false) query: String?,
        @PageableDefault(size = 10) pageable: Pageable
    ): ResponseEntity<Page<AdminBookingMemberSummaryResponse>> {
        return ResponseEntity.ok(bookingService.searchBookingMembers(query, pageable))
    }

    @GetMapping("/users/{userId}/bookings")
    fun getUserBookings(
        @PathVariable userId: UUID,
        @RequestParam("status", required = false) status: String?,
        @PageableDefault(size = 20, sort = ["scheduledAt"], direction = Sort.Direction.DESC) pageable: Pageable
    ): ResponseEntity<Page<AdminUserBookingHistoryItemResponse>> {
        return ResponseEntity.ok(bookingService.getAdminUserBookings(userId, status, pageable))
    }

    @GetMapping("/classes/{classId}/attendees")
    fun getClassAttendees(
        @PathVariable classId: UUID,
        @RequestParam("status", required = false) status: String?,
        @PageableDefault(size = 50, sort = ["bookedAt"], direction = Sort.Direction.ASC) pageable: Pageable
    ): ResponseEntity<AdminAttendeeListResponse> {
        return ResponseEntity.ok(bookingService.getClassAttendees(classId, status, pageable))
    }
}
