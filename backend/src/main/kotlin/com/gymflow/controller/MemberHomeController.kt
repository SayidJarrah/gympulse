package com.gymflow.controller

import com.gymflow.dto.MemberHomeClassPreviewResponse
import com.gymflow.service.MemberHomeService
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/member-home")
class MemberHomeController(
    private val memberHomeService: MemberHomeService
) {

    @GetMapping("/classes-preview")
    @PreAuthorize("hasRole('USER')")
    fun getClassesPreview(
        @RequestParam("timeZone", required = false) timeZone: String?
    ): ResponseEntity<MemberHomeClassPreviewResponse> {
        return ResponseEntity.ok(memberHomeService.getUpcomingClassesPreview(timeZone))
    }
}
