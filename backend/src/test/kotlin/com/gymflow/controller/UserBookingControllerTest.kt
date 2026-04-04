package com.gymflow.controller

import com.gymflow.domain.User
import com.gymflow.dto.BookingResponse
import com.gymflow.service.BookingNotActiveException
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.OffsetDateTime
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserBookingControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var jwtService: JwtService

    @MockBean
    private lateinit var bookingService: BookingService

    @Test
    fun `create booking returns 201 for authenticated user`() {
        val user = buildUser("USER")
        val response = buildBookingResponse(user.id)

        given(bookingService.createBooking(user.id, com.gymflow.dto.BookingRequest(response.classId.toString())))
            .willReturn(response)

        mockMvc.perform(
            post("/api/v1/bookings")
                .header("Authorization", "Bearer ${jwtService.generateToken(user)}")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"classId":"${response.classId}"}""")
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.className").value("Yoga Flow"))
    }

    @Test
    fun `get my bookings returns paginated response`() {
        val user = buildUser("USER")
        val response = buildBookingResponse(user.id)
        val page = PageImpl(listOf(response), PageRequest.of(0, 20), 1)

        given(bookingService.getMyBookings(user.id, "CONFIRMED", PageRequest.of(0, 20))).willReturn(page)

        mockMvc.perform(
            get("/api/v1/bookings/me")
                .queryParam("status", "CONFIRMED")
                .queryParam("page", "0")
                .queryParam("size", "20")
                .header("Authorization", "Bearer ${jwtService.generateToken(user)}")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].className").value("Yoga Flow"))
            .andExpect(jsonPath("$.totalElements").value(1))
    }

    @Test
    fun `cancel booking returns 409 when booking is not active`() {
        val user = buildUser("USER")
        val bookingId = UUID.randomUUID()

        given(bookingService.cancelBooking(user.id, bookingId))
            .willThrow(BookingNotActiveException("Booking is not active"))

        mockMvc.perform(
            delete("/api/v1/bookings/$bookingId")
                .header("Authorization", "Bearer ${jwtService.generateToken(user)}")
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("BOOKING_NOT_ACTIVE"))
    }

    @Test
    fun `booking endpoints reject admin tokens`() {
        val admin = buildUser("ADMIN")

        mockMvc.perform(
            post("/api/v1/bookings")
                .header("Authorization", "Bearer ${jwtService.generateToken(admin)}")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"classId":"${UUID.randomUUID()}"}""")
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

    private fun buildBookingResponse(userId: UUID) = BookingResponse(
        id = UUID.randomUUID(),
        userId = userId,
        classId = UUID.randomUUID(),
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
