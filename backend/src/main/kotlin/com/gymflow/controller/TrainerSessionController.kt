package com.gymflow.controller

import com.gymflow.dto.TrainerScheduleResponse
import com.gymflow.service.PtBookingService
import com.gymflow.service.TrainerNotFoundException
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.util.UUID

@RestController
@RequestMapping("/api/v1/trainers/me")
class TrainerSessionController(
    private val ptBookingService: PtBookingService
) {

    @GetMapping("/pt-sessions")
    @PreAuthorize("hasRole('TRAINER')")
    fun getMySchedule(
        @RequestParam("start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) start: LocalDate?,
        @RequestParam("end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) end: LocalDate?,
        authentication: Authentication
    ): ResponseEntity<TrainerScheduleResponse> {
        val trainerId = UUID.fromString(authentication.name)
        val startDate = start ?: LocalDate.now()
        val endDate = end ?: startDate.plusDays(14)
        return ResponseEntity.ok(ptBookingService.getTrainerSchedule(trainerId, startDate, endDate))
    }
}
