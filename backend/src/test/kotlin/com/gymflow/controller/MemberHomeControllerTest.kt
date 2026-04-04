package com.gymflow.controller

import com.gymflow.domain.User
import com.gymflow.dto.MemberHomeClassPreviewItemResponse
import com.gymflow.dto.MemberHomeClassPreviewResponse
import com.gymflow.exception.MemberHomeInvalidTimeZoneException
import com.gymflow.service.JwtService
import com.gymflow.service.MemberHomeService
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
class MemberHomeControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var jwtService: JwtService

    @MockBean
    private lateinit var memberHomeService: MemberHomeService

    @Test
    fun `get classes preview returns 200 for authenticated user`() {
        val user = buildUser(role = "USER")
        val response = MemberHomeClassPreviewResponse(
            timeZone = "Europe/Warsaw",
            rangeStartDate = LocalDate.parse("2026-04-04"),
            rangeEndDateExclusive = LocalDate.parse("2026-04-18"),
            entries = listOf(
                MemberHomeClassPreviewItemResponse(
                    id = UUID.randomUUID(),
                    name = "Yoga Flow",
                    scheduledAt = OffsetDateTime.parse("2026-04-05T16:00:00Z"),
                    localDate = LocalDate.parse("2026-04-05"),
                    durationMin = 60,
                    trainerDisplayName = "Jane Smith",
                    classPhotoUrl = "/api/v1/class-templates/123/photo"
                )
            )
        )

        given(memberHomeService.getUpcomingClassesPreview("Europe/Warsaw")).willReturn(response)

        mockMvc.perform(
            get("/api/v1/member-home/classes-preview")
                .queryParam("timeZone", "Europe/Warsaw")
                .header("Authorization", "Bearer ${jwtService.generateToken(user)}")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.timeZone").value("Europe/Warsaw"))
            .andExpect(jsonPath("$.entries[0].name").value("Yoga Flow"))
            .andExpect(jsonPath("$.entries[0].trainerDisplayName").value("Jane Smith"))
    }

    @Test
    fun `get classes preview returns 400 for invalid time zone`() {
        val user = buildUser(role = "USER")

        given(memberHomeService.getUpcomingClassesPreview("bad-zone"))
            .willThrow(MemberHomeInvalidTimeZoneException("Invalid timeZone"))

        mockMvc.perform(
            get("/api/v1/member-home/classes-preview")
                .queryParam("timeZone", "bad-zone")
                .header("Authorization", "Bearer ${jwtService.generateToken(user)}")
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_TIME_ZONE"))
    }

    @Test
    fun `get classes preview returns 401 without token`() {
        mockMvc.perform(
            get("/api/v1/member-home/classes-preview")
                .queryParam("timeZone", "Europe/Warsaw")
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `get classes preview returns 403 for admin token`() {
        val admin = buildUser(role = "ADMIN")

        mockMvc.perform(
            get("/api/v1/member-home/classes-preview")
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
