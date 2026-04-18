package com.gymflow.controller

import com.gymflow.domain.User
import com.gymflow.dto.ScheduleEntryBookingSummaryResponse
import com.gymflow.dto.UserClassScheduleEntryResponse
import com.gymflow.dto.UserClassScheduleResponse
import com.gymflow.service.InvalidScheduleViewException
import com.gymflow.service.JwtService
import com.gymflow.service.UserClassScheduleService
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserClassScheduleControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var jwtService: JwtService

    @MockBean
    private lateinit var userClassScheduleService: UserClassScheduleService

    @Test
    fun `get schedule returns 200 for authenticated user`() {
        val user = buildUser(role = "USER")
        val response = UserClassScheduleResponse(
            view = "week",
            anchorDate = LocalDate.parse("2026-03-30"),
            timeZone = "Europe/Warsaw",
            week = "2026-W14",
            rangeStartDate = LocalDate.parse("2026-03-30"),
            rangeEndDateExclusive = LocalDate.parse("2026-04-06"),
            hasActiveMembership = true,
            entries = listOf(
                UserClassScheduleEntryResponse(
                    id = UUID.randomUUID(),
                    name = "Yoga Flow",
                    scheduledAt = OffsetDateTime.parse("2026-03-30T16:00:00Z"),
                    localDate = LocalDate.parse("2026-03-30"),
                    durationMin = 60,
                    trainerNames = listOf("Jane Doe"),
                    classPhotoUrl = "/api/v1/class-templates/123/photo",
                    capacity = 20,
                    confirmedBookings = 4,
                    remainingSpots = 16,
                    currentUserBooking = ScheduleEntryBookingSummaryResponse(
                        id = UUID.randomUUID(),
                        status = "CONFIRMED",
                        bookedAt = OffsetDateTime.parse("2026-03-29T12:00:00Z")
                    ),
                    bookingAllowed = true,
                    bookingDeniedReason = null,
                    cancellationAllowed = true
                )
            )
        )

        given(
            userClassScheduleService.getSchedule(
                user.id,
                "week",
                "2026-03-30",
                "Europe/Warsaw"
            )
        ).willReturn(response)

        mockMvc.perform(
            get("/api/v1/class-schedule")
                .queryParam("view", "week")
                .queryParam("anchorDate", "2026-03-30")
                .queryParam("timeZone", "Europe/Warsaw")
                .header("Authorization", "Bearer ${jwtService.generateToken(user)}")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.view").value("week"))
            .andExpect(jsonPath("$.hasActiveMembership").value(true))
            .andExpect(jsonPath("$.timeZone").value("Europe/Warsaw"))
            .andExpect(jsonPath("$.entries[0].name").value("Yoga Flow"))
            .andExpect(jsonPath("$.entries[0].bookingAllowed").value(true))
            .andExpect(jsonPath("$.entries[0].cancellationAllowed").value(true))
    }

    @Test
    fun `get schedule returns 400 for invalid view`() {
        val user = buildUser(role = "USER")

        given(userClassScheduleService.getSchedule(user.id, "bad", "2026-03-30", "Europe/Warsaw"))
            .willThrow(InvalidScheduleViewException("Invalid schedule view"))

        mockMvc.perform(
            get("/api/v1/class-schedule")
                .queryParam("view", "bad")
                .queryParam("anchorDate", "2026-03-30")
                .queryParam("timeZone", "Europe/Warsaw")
                .header("Authorization", "Bearer ${jwtService.generateToken(user)}")
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_SCHEDULE_VIEW"))
    }

    @Test
    fun `get schedule returns 200 when membership is missing`() {
        val user = buildUser(role = "USER")
        val response = UserClassScheduleResponse(
            view = "week",
            anchorDate = LocalDate.parse("2026-03-30"),
            timeZone = "Europe/Warsaw",
            week = "2026-W14",
            rangeStartDate = LocalDate.parse("2026-03-30"),
            rangeEndDateExclusive = LocalDate.parse("2026-04-06"),
            hasActiveMembership = false,
            entries = emptyList()
        )

        given(userClassScheduleService.getSchedule(user.id, "week", "2026-03-30", "Europe/Warsaw"))
            .willReturn(response)

        mockMvc.perform(
            get("/api/v1/class-schedule")
                .queryParam("view", "week")
                .queryParam("anchorDate", "2026-03-30")
                .queryParam("timeZone", "Europe/Warsaw")
                .header("Authorization", "Bearer ${jwtService.generateToken(user)}")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.hasActiveMembership").value(false))
    }

    @Test
    fun `get schedule returns 401 without token`() {
        mockMvc.perform(
            get("/api/v1/class-schedule")
                .queryParam("view", "week")
                .queryParam("anchorDate", "2026-03-30")
                .queryParam("timeZone", "Europe/Warsaw")
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `get schedule returns 403 for admin token`() {
        val admin = buildUser(role = "ADMIN")

        mockMvc.perform(
            get("/api/v1/class-schedule")
                .queryParam("view", "week")
                .queryParam("anchorDate", "2026-03-30")
                .queryParam("timeZone", "Europe/Warsaw")
                .header("Authorization", "Bearer ${jwtService.generateToken(admin)}")
        )
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.code").value("ACCESS_DENIED"))
    }

    private fun buildUser(
        id: UUID = UUID.randomUUID(),
        role: String = "USER"
    ) = User(
        id = id,
        email = "member@example.com",
        passwordHash = "hash",
        role = role,
        createdAt = OffsetDateTime.parse("2026-03-29T09:00:00Z"),
        updatedAt = OffsetDateTime.parse("2026-03-29T09:00:00Z")
    )
}
