package com.gymflow.service

import com.gymflow.domain.Booking
import com.gymflow.domain.ClassInstance
import com.gymflow.domain.ClassTemplate
import com.gymflow.domain.User
import com.gymflow.domain.UserMembership
import com.gymflow.dto.AdminBookingRequest
import com.gymflow.dto.BookingRequest
import com.gymflow.exception.MembershipRequiredException
import com.gymflow.repository.BookingRepository
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserRepository
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.data.domain.PageRequest
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Optional
import java.util.UUID

class BookingServiceTest {

    private val bookingRepository: BookingRepository = mockk()
    private val classInstanceRepository: ClassInstanceRepository = mockk()
    private val userMembershipRepository: UserMembershipRepository = mockk()
    private val userRepository: UserRepository = mockk()

    private lateinit var service: BookingService

    @BeforeEach
    fun setUp() {
        service = BookingService(bookingRepository, classInstanceRepository, userMembershipRepository, userRepository)
    }

    @Test
    fun `create booking increments membership usage and returns booking response`() {
        val userId = UUID.randomUUID()
        val classInstance = buildFutureClass()
        val membership = buildMembership(userId)
        val today = LocalDate.now(ZoneOffset.UTC)

        every { userMembershipRepository.findAccessibleActiveMembershipForUpdate(userId, today) } returns membership
        every { classInstanceRepository.findActiveByIdForUpdate(classInstance.id) } returns classInstance
        every { bookingRepository.findConfirmedByUserIdAndClassId(userId, classInstance.id) } returns null
        every { bookingRepository.countConfirmedByClassId(classInstance.id) } returns 2
        every { bookingRepository.save(any()) } answers { firstArg<Booking>() }
        every { classInstanceRepository.findWithDetailsById(classInstance.id) } returns classInstance

        val response = service.createBooking(userId, BookingRequest(classInstance.id.toString()))

        assertEquals(userId, response.userId)
        assertEquals(classInstance.id, response.classId)
        assertEquals("CONFIRMED", response.status)
        assertEquals("Yoga Flow", response.className)
        assertEquals(1, membership.bookingsUsedThisMonth)
        assertTrue(response.isCancellable)
        verify(exactly = 1) { bookingRepository.save(any()) }
    }

    @Test
    fun `create booking requires active membership for self service`() {
        val userId = UUID.randomUUID()
        val classId = UUID.randomUUID()
        val today = LocalDate.now(ZoneOffset.UTC)

        every { userMembershipRepository.findAccessibleActiveMembershipForUpdate(userId, today) } returns null

        assertThrows<MembershipRequiredException> {
            service.createBooking(userId, BookingRequest(classId.toString()))
        }
    }

    @Test
    fun `create booking rejects full classes`() {
        val userId = UUID.randomUUID()
        val classInstance = buildFutureClass(capacity = 5)
        val membership = buildMembership(userId)
        val today = LocalDate.now(ZoneOffset.UTC)

        every { userMembershipRepository.findAccessibleActiveMembershipForUpdate(userId, today) } returns membership
        every { classInstanceRepository.findActiveByIdForUpdate(classInstance.id) } returns classInstance
        every { bookingRepository.findConfirmedByUserIdAndClassId(userId, classInstance.id) } returns null
        every { bookingRepository.countConfirmedByClassId(classInstance.id) } returns 5

        assertThrows<ClassFullException> {
            service.createBooking(userId, BookingRequest(classInstance.id.toString()))
        }
    }

    @Test
    fun `cancel booking rejects requests inside cutoff window`() {
        val userId = UUID.randomUUID()
        val classInstance = buildFutureClass(scheduledAt = OffsetDateTime.now(ZoneOffset.UTC).plusHours(2))
        val booking = Booking(
            id = UUID.randomUUID(),
            userId = userId,
            classId = classInstance.id,
            status = "CONFIRMED",
            bookedAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(1)
        )

        every { bookingRepository.findByIdAndUserId(booking.id, userId) } returns booking
        every { classInstanceRepository.findActiveByIdForUpdate(classInstance.id) } returns classInstance
        every { bookingRepository.findByIdAndUserIdForUpdate(booking.id, userId) } returns booking

        assertThrows<CancellationWindowClosedException> {
            service.cancelBooking(userId, booking.id)
        }
    }

    @Test
    fun `admin create booking hides non user targets behind user not found`() {
        val userId = UUID.randomUUID()

        every { userRepository.findByIdAndRoleAndDeletedAtIsNull(userId, "USER") } returns null

        assertThrows<UserNotFoundException> {
            service.createBookingForUser(
                AdminBookingRequest(
                    userId = userId.toString(),
                    classId = UUID.randomUUID().toString()
                )
            )
        }
    }

    @Test
    fun `member search returns empty page for blank query`() {
        val page = service.searchBookingMembers("   ", PageRequest.of(0, 50))

        assertTrue(page.isEmpty)
        assertEquals(20, page.size)
        verify(exactly = 0) { userRepository.searchBookingMembers(any(), any(), any()) }
    }

    @Test
    fun `get my bookings rejects invalid status filters`() {
        assertThrows<InvalidBookingStatusException> {
            service.getMyBookings(UUID.randomUUID(), "pending", PageRequest.of(0, 20))
        }
    }

    private fun buildFutureClass(
        capacity: Int = 12,
        scheduledAt: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC).plusDays(2)
    ) = ClassInstance(
        id = UUID.randomUUID(),
        template = ClassTemplate(
            id = UUID.randomUUID(),
            name = "Yoga Flow",
            category = "Mind & Body",
            defaultDurationMin = 60,
            defaultCapacity = capacity,
            difficulty = "All Levels",
            photoData = byteArrayOf(1),
            photoMimeType = "image/png"
        ),
        name = "Yoga Flow",
        type = "GROUP",
        status = "SCHEDULED",
        scheduledAt = scheduledAt,
        durationMin = 60,
        capacity = capacity
    )

    private fun buildMembership(userId: UUID) = UserMembership(
        id = UUID.randomUUID(),
        userId = userId,
        planId = UUID.randomUUID(),
        status = "ACTIVE",
        startDate = LocalDate.now(ZoneOffset.UTC).minusDays(10),
        endDate = LocalDate.now(ZoneOffset.UTC).plusDays(20),
        bookingsUsedThisMonth = 0,
        createdAt = OffsetDateTime.now(ZoneOffset.UTC),
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC)
    )
}
