package com.gymflow.controller

import com.gymflow.dto.AdminPtSessionResponse
import com.gymflow.dto.AdminPtStatsResponse
import com.gymflow.service.PtBookingService
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

@RestController
@RequestMapping("/api/v1/admin/pt-sessions")
class AdminPtSessionController(
    private val ptBookingService: PtBookingService
) {

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    fun getSessions(
        @RequestParam("trainerId", required = false) trainerId: UUID?,
        @RequestParam("status", required = false) status: String?,
        @RequestParam("start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) start: LocalDate?,
        @RequestParam("end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) end: LocalDate?,
        @RequestParam("q", required = false) q: String?,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<AdminPtSessionResponse>> {
        val windowStart = start?.atStartOfDay()?.atOffset(ZoneOffset.UTC)
        val windowEnd = end?.plusDays(1)?.atStartOfDay()?.atOffset(ZoneOffset.UTC)
        return ResponseEntity.ok(
            ptBookingService.getAdminSessions(trainerId, status, windowStart, windowEnd, q, pageable)
        )
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    fun getStats(): ResponseEntity<AdminPtStatsResponse> {
        return ResponseEntity.ok(ptBookingService.getAdminStats())
    }

    @GetMapping("/export")
    @PreAuthorize("hasRole('ADMIN')")
    fun exportCsv(
        @RequestParam("trainerId", required = false) trainerId: UUID?,
        @RequestParam("status", required = false) status: String?,
        @RequestParam("start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) start: LocalDate?,
        @RequestParam("end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) end: LocalDate?,
        @RequestParam("q", required = false) q: String?
    ): ResponseEntity<ByteArray> {
        val windowStart = start?.atStartOfDay()?.atOffset(ZoneOffset.UTC)
        val windowEnd = end?.plusDays(1)?.atStartOfDay()?.atOffset(ZoneOffset.UTC)
        val csv = ptBookingService.exportAdminSessionsCsv(trainerId, status, windowStart, windowEnd, q)
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"pt-sessions.csv\"")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(csv.toByteArray(Charsets.UTF_8))
    }
}
