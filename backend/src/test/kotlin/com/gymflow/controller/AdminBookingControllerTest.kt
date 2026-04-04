package com.gymflow.controller

import com.gymflow.domain.User
import com.gymflow.dto.AdminBookingMemberSummaryResponse
import com.gymflow.dto.BookingResponse
import com.gymflow.service.BookingService
import com.gymflow.service.JwtService
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.OffsetDateTime
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminBookingControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var jwtService: JwtService

    @MockBean
    private lateinit var bookingService: BookingService

    @Test
    fun `admin create booking returns 201`() {
        val admin = buildUser("ADMIN")
        val targetUserId = UUID.randomUUID()
        val classId = UUID.randomUUID()
        val response = buildBookingResponse(targetUserId, classId)

        given(
            bookingService.createBookingForUser(
                com.gymflow.dto.AdminBookingRequest(
                    userId = targetUserId.toString(),
                    classId = classId.toString()
                )
            )
        ).willReturn(response)

        mockMvc.perform(
            post("/api/v1/admin/bookings")
                .header("Authorization", "Bearer ${jwtService.generateToken(admin)}")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"userId":"$targetUserId","classId":"$classId"}""")
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.userId").value(targetUserId.toString()))
    }

    @Test
    fun `admin member search returns results`() {
        val admin = buildUser("ADMIN")
        val member = AdminBookingMemberSummaryResponse(
            id = UUID.randomUUID(),
            email = "member@example.com",
            firstName = "Anna",
            lastName = "Nowak",
            displayName = "Anna Nowak",
            hasActiveMembership = false
        )
        val page = PageImpl(listOf(member), PageRequest.of(0, 10), 1)

        given(bookingService.searchBookingMembers("ann", PageRequest.of(0, 10))).willReturn(page)

        mockMvc.perform(
            get("/api/v1/admin/booking-members")
                .queryParam("query", "ann")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .header("Authorization", "Bearer ${jwtService.generateToken(admin)}")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].displayName").value("Anna Nowak"))
    }

    @Test
    fun `admin booking endpoints reject user tokens`() {
        val user = buildUser("USER")

        mockMvc.perform(
            get("/api/v1/admin/booking-members")
                .queryParam("query", "ann")
                .header("Authorization", "Bearer ${jwtService.generateToken(user)}")
        )
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.code").value("ACCESS_DENIED"))
    }

    private fun buildUser(role: String) = User(
        id = UUID.randomUUID(),
        email = if (role == "ADMIN") "admin@example.com" else "member@example.com",
        passwordHash = "hash",
        role = role,
        createdAt = OffsetDateTime.parse("2026-03-29T09:00:00Z"),
        updatedAt = OffsetDateTime.parse("2026-03-29T09:00:00Z")
    )

    private fun buildBookingResponse(userId: UUID, classId: UUID) = BookingResponse(
        id = UUID.randomUUID(),
        userId = userId,
        classId = classId,
        status = "CONFIRMED",
        bookedAt = OffsetDateTime.parse("2026-04-04T12:15:00Z"),
        cancelledAt = null,
        className = "Yoga Flow",
        scheduledAt = OffsetDateTime.parse("2026-04-06T16:00:00Z"),
        durationMin = 60,
        trainerNames = listOf("Jane Doe"),
        classPhotoUrl = null,
        isCancellable = true,
        cancellationCutoffAt = OffsetDateTime.parse("2026-04-06T13:00:00Z")
    )
}
