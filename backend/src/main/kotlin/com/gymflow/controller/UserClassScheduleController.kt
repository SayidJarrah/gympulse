package com.gymflow.controller

import com.gymflow.dto.UserClassScheduleResponse
import com.gymflow.service.UserClassScheduleService
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/class-schedule")
class UserClassScheduleController(
    private val userClassScheduleService: UserClassScheduleService
) {

    @GetMapping
    @PreAuthorize("hasRole('USER')")
    fun getSchedule(
        @RequestParam("view", required = false) view: String?,
        @RequestParam("anchorDate", required = false) anchorDate: String?,
        @RequestParam("timeZone", required = false) timeZone: String?,
        authentication: Authentication
    ): ResponseEntity<UserClassScheduleResponse> {
        val userId = UUID.fromString(authentication.name)
        val response = userClassScheduleService.getSchedule(userId, view, anchorDate, timeZone)
        return ResponseEntity.ok(response)
    }
}
