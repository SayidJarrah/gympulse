package com.gymflow.controller

import com.gymflow.dto.PtTrainerSummaryResponse
import com.gymflow.dto.TrainerAvailabilityResponse
import com.gymflow.service.PtBookingService
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.util.UUID

@RestController
@RequestMapping("/api/v1/trainers")
class PtTrainerController(
    private val ptBookingService: PtBookingService
) {

    @GetMapping("/pt")
    @PreAuthorize("isAuthenticated()")
    fun listPtTrainers(
        @RequestParam("specialty", required = false) specialties: List<String>?,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<PtTrainerSummaryResponse>> {
        return ResponseEntity.ok(ptBookingService.listPtTrainers(specialties, pageable))
    }

    @GetMapping("/{trainerId}/pt-availability")
    @PreAuthorize("isAuthenticated()")
    fun getAvailability(
        @PathVariable trainerId: UUID,
        @RequestParam("start") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) start: LocalDate,
        @RequestParam("end") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) end: LocalDate
    ): ResponseEntity<TrainerAvailabilityResponse> {
        // Clamp window to max 14 days
        val clampedEnd = if (end.isAfter(start.plusDays(14))) start.plusDays(14) else end
        return ResponseEntity.ok(ptBookingService.getAvailability(trainerId, start, clampedEnd))
    }
}
