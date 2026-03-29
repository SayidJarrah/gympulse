package com.gymflow.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.gymflow.domain.User
import com.gymflow.dto.UpdateUserProfileRequest
import com.gymflow.dto.UserProfileResponse
import com.gymflow.service.InvalidPhoneException
import com.gymflow.service.JwtService
import com.gymflow.service.UserProfileService
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserProfileControllerIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var jwtService: JwtService

    @MockBean
    private lateinit var userProfileService: UserProfileService

    @Test
    fun `get my profile returns 200 for authenticated user`() {
        val user = buildUser(role = "USER")
        val response = buildResponse(user)
        given(userProfileService.getMyProfile(user.id)).willReturn(response)

        mockMvc.perform(
            get("/api/v1/profile/me")
                .header("Authorization", "Bearer ${jwtService.generateToken(user)}")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.userId").value(user.id.toString()))
            .andExpect(jsonPath("$.email").value(user.email))
            .andExpect(jsonPath("$.firstName").value("Alice"))
            .andExpect(jsonPath("$.fitnessGoals[0]").value("Build strength"))
    }

    @Test
    fun `get my profile returns 403 for admin token`() {
        val admin = buildUser(role = "ADMIN")

        mockMvc.perform(
            get("/api/v1/profile/me")
                .header("Authorization", "Bearer ${jwtService.generateToken(admin)}")
        )
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.code").value("ACCESS_DENIED"))
    }

    @Test
    fun `get my profile returns 401 without token`() {
        mockMvc.perform(get("/api/v1/profile/me"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `update my profile returns mapped validation error`() {
        val user = buildUser(role = "USER")
        val request = UpdateUserProfileRequest(phone = "12345")

        given(userProfileService.updateMyProfile(user.id, request))
            .willThrow(InvalidPhoneException("Phone is invalid"))

        mockMvc.perform(
            put("/api/v1/profile/me")
                .header("Authorization", "Bearer ${jwtService.generateToken(user)}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_PHONE"))
    }

    private fun buildUser(
        id: UUID = UUID.randomUUID(),
        role: String = "USER"
    ) = User(
        id = id,
        email = "alice@example.com",
        passwordHash = "hash",
        role = role,
        createdAt = OffsetDateTime.parse("2026-03-29T09:00:00Z"),
        updatedAt = OffsetDateTime.parse("2026-03-29T09:00:00Z")
    )

    private fun buildResponse(user: User) = UserProfileResponse(
        userId = user.id,
        email = user.email,
        firstName = "Alice",
        lastName = "Brown",
        phone = "+48123123123",
        dateOfBirth = LocalDate.of(1994, 8, 12),
        fitnessGoals = listOf("Build strength", "Improve mobility"),
        preferredClassTypes = listOf("Yoga", "HIIT"),
        createdAt = OffsetDateTime.parse("2026-03-29T10:00:00Z"),
        updatedAt = OffsetDateTime.parse("2026-03-29T12:30:00Z")
    )
}
