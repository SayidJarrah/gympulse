package com.gymflow.controller

import com.gymflow.dto.ImportResultResponse
import com.gymflow.service.InvalidExportFormatException
import com.gymflow.service.ScheduleExportService
import com.gymflow.service.ScheduleImportService
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/v1/admin/schedule")
@PreAuthorize("hasRole('ADMIN')")
class AdminScheduleImportExportController(
    private val scheduleImportService: ScheduleImportService,
    private val scheduleExportService: ScheduleExportService
) {

    @PostMapping("/import")
    fun importSchedule(@RequestParam("file") file: MultipartFile): ResponseEntity<ImportResultResponse> {
        return ResponseEntity.ok(scheduleImportService.importSchedule(file))
    }

    @GetMapping("/export")
    fun exportSchedule(
        @RequestParam week: String,
        @RequestParam format: String
    ): ResponseEntity<ByteArray> {
        val normalized = format.lowercase()
        val (contentType, extension, payload) = when (normalized) {
            "csv" -> Triple("text/csv; charset=UTF-8", "csv", scheduleExportService.exportCsv(week))
            "ical" -> Triple("text/calendar; charset=UTF-8", "ics", scheduleExportService.exportIcal(week))
            else -> throw InvalidExportFormatException("Invalid export format")
        }

        val filename = "schedule-${week}.${extension}"
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"${filename}\"")
            .contentType(MediaType.parseMediaType(contentType))
            .body(payload)
    }
}
