package com.gymflow.controller

import com.gymflow.dto.ActivityEventDto
import com.gymflow.dto.LandingActivityResponse
import com.gymflow.dto.LandingStatsResponse
import com.gymflow.dto.LandingViewerStateResponse
import com.gymflow.service.ActivityEventService
import com.gymflow.service.LandingService
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.UUID

@RestController
@RequestMapping("/api/v1/landing")
class LandingController(
    private val landingService: LandingService,
    private val activityEventService: ActivityEventService
) {

    /**
     * GET /api/v1/landing/viewer-state
     *
     * Returns the current viewer state (loggedOut | booked | nobooked) together
     * with enough data to render the landing-page hero without additional round trips.
     * Auth is optional — an absent or invalid JWT resolves to loggedOut.
     */
    @GetMapping("/viewer-state")
    fun getViewerState(authentication: Authentication?): ResponseEntity<LandingViewerStateResponse> {
        val userId = authentication?.name?.let { runCatching { UUID.fromString(it) }.getOrNull() }
        return ResponseEntity.ok(landingService.getViewerState(userId))
    }

    /**
     * GET /api/v1/landing/stats
     *
     * Returns live club stats shaped for the landing-page strip.
     * Authed users receive the detailed variant; anonymous users receive the public variant.
     */
    @GetMapping("/stats")
    fun getStats(authentication: Authentication?): ResponseEntity<LandingStatsResponse> {
        val authed = authentication?.isAuthenticated == true
        return ResponseEntity.ok(landingService.getStats(authed))
    }

    /**
     * GET /api/v1/landing/activity
     *
     * Returns the last 20 activity events. Authenticated callers receive real actor names
     * and full event text; public callers receive anonymized data.
     */
    @GetMapping("/activity")
    fun getActivity(authentication: Authentication?): ResponseEntity<LandingActivityResponse> {
        val authed = authentication?.isAuthenticated == true
        return ResponseEntity.ok(landingService.getActivity(authed))
    }

    /**
     * GET /api/v1/landing/activity/stream
     *
     * Server-sent events stream. Pushes new activity events as they occur.
     * Auth is read once at connection time — authed connections receive full data,
     * public connections receive anonymized data.
     *
     * Keepalive comments (": keepalive") are sent by the emitter timeout machinery.
     * On timeout the client's EventSource will automatically reconnect.
     */
    @GetMapping("/activity/stream", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun streamActivity(): SseEmitter {
        val emitter = SseEmitter(0L) // 0 = no server-side timeout; the browser reconnects naturally
        activityEventService.registerEmitter(emitter)
        return emitter
    }
}
