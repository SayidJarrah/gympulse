package com.gymflow.service

import com.gymflow.domain.Booking
import com.gymflow.domain.ClassInstance
import com.gymflow.domain.ClassTemplate
import com.gymflow.domain.User
import com.gymflow.domain.UserMembership
import com.gymflow.dto.AdminBookingRequest
import com.gymflow.dto.AdminUserBookingHistoryItemResponse
import com.gymflow.dto.BookingRequest
import com.gymflow.exception.MembershipRequiredException
import com.gymflow.repository.BookingRepository
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
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

    // --- createBooking ---

    @Test
    fun `create booking increments membership usage and returns booking response`() {
        val userId = UUID.randomUUID()
        val classInstance = buildFutureClass()
        val membership = buildMembership(userId)
        val today = LocalDate.now(ZoneOffset.UTC)

        every { userMembershipRepository.findAccessibleActiveMembershipForUpdate(userId, today) } returns membership
        every { classInstanceRepository.findActiveByIdForUpdate(classInstance.id) } returns classInstance
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
        // cancellationCutoffAt must be exactly 2h before scheduled start
        assertEquals(classInstance.scheduledAt.minusHours(2), response.cancellationCutoffAt)
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
    fun `create booking throws when class is not found`() {
        val userId = UUID.randomUUID()
        val classId = UUID.randomUUID()
        val today = LocalDate.now(ZoneOffset.UTC)
        val membership = buildMembership(userId)

        every { userMembershipRepository.findAccessibleActiveMembershipForUpdate(userId, today) } returns membership
        every { classInstanceRepository.findActiveByIdForUpdate(classId) } returns null

        assertThrows<ClassNotFoundException> {
            service.createBooking(userId, BookingRequest(classId.toString()))
        }
    }

    @Test
    fun `create booking rejects non-bookable class types`() {
        val userId = UUID.randomUUID()
        val classInstance = buildFutureClass().copy(type = "PERSONAL")
        val membership = buildMembership(userId)
        val today = LocalDate.now(ZoneOffset.UTC)

        every { userMembershipRepository.findAccessibleActiveMembershipForUpdate(userId, today) } returns membership
        every { classInstanceRepository.findActiveByIdForUpdate(classInstance.id) } returns classInstance

        assertThrows<ClassNotBookableException> {
            service.createBooking(userId, BookingRequest(classInstance.id.toString()))
        }
    }

    @Test
    fun `create booking rejects classes that have already started`() {
        val userId = UUID.randomUUID()
        val classInstance = buildFutureClass(
            scheduledAt = OffsetDateTime.now(ZoneOffset.UTC).minusHours(1)
        )
        val membership = buildMembership(userId)
        val today = LocalDate.now(ZoneOffset.UTC)

        every { userMembershipRepository.findAccessibleActiveMembershipForUpdate(userId, today) } returns membership
        every { classInstanceRepository.findActiveByIdForUpdate(classInstance.id) } returns classInstance

        assertThrows<ClassAlreadyStartedException> {
            service.createBooking(userId, BookingRequest(classInstance.id.toString()))
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
        every { bookingRepository.countConfirmedByClassId(classInstance.id) } returns 5

        assertThrows<ClassFullException> {
            service.createBooking(userId, BookingRequest(classInstance.id.toString()))
        }
    }

    @Test
    fun `create booking allows duplicate booking on the same instance for the same user`() {
        val userId = UUID.randomUUID()
        val classInstance = buildFutureClass(capacity = 10)
        val membership = buildMembership(userId)
        val today = LocalDate.now(ZoneOffset.UTC)

        every { userMembershipRepository.findAccessibleActiveMembershipForUpdate(userId, today) } returns membership
        every { classInstanceRepository.findActiveByIdForUpdate(classInstance.id) } returns classInstance
        every { bookingRepository.countConfirmedByClassId(classInstance.id) } returns 1
        every { bookingRepository.save(any()) } answers { firstArg<Booking>() }
        every { classInstanceRepository.findWithDetailsById(classInstance.id) } returns classInstance

        // Two successive calls — both succeed. No ALREADY_BOOKED check is performed.
        val first = service.createBooking(userId, BookingRequest(classInstance.id.toString()))
        val second = service.createBooking(userId, BookingRequest(classInstance.id.toString()))

        assertEquals("CONFIRMED", first.status)
        assertEquals("CONFIRMED", second.status)
        verify(exactly = 2) { bookingRepository.save(any()) }
    }

    // --- cancelBooking ---

    @Test
    fun `cancel booking succeeds outside the 2 hour cutoff window`() {
        val userId = UUID.randomUUID()
        // scheduled ~3h out → outside the 2h cutoff
        val classInstance = buildFutureClass(scheduledAt = OffsetDateTime.now(ZoneOffset.UTC).plusHours(3))
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
        every { classInstanceRepository.findWithDetailsById(classInstance.id) } returns classInstance
        every { bookingRepository.save(any()) } answers { firstArg<Booking>() }

        val response = service.cancelBooking(userId, booking.id)

        assertEquals("CANCELLED", response.status)
        assertTrue(booking.cancelledAt != null)
    }

    @Test
    fun `cancel booking rejects requests inside the 2 hour cutoff window`() {
        val userId = UUID.randomUUID()
        // scheduled 1h out → inside 2h cutoff
        val classInstance = buildFutureClass(scheduledAt = OffsetDateTime.now(ZoneOffset.UTC).plusHours(1))
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
    fun `cancel booking rejects bookings that are not confirmed`() {
        val userId = UUID.randomUUID()
        val classInstance = buildFutureClass(scheduledAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(1))
        val booking = Booking(
            id = UUID.randomUUID(),
            userId = userId,
            classId = classInstance.id,
            status = "CANCELLED",
            bookedAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(1),
            cancelledAt = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5)
        )

        every { bookingRepository.findByIdAndUserId(booking.id, userId) } returns booking
        every { classInstanceRepository.findActiveByIdForUpdate(classInstance.id) } returns classInstance
        every { bookingRepository.findByIdAndUserIdForUpdate(booking.id, userId) } returns booking

        assertThrows<BookingNotActiveException> {
            service.cancelBooking(userId, booking.id)
        }
    }

    @Test
    fun `cancel booking rejects attempts by the wrong user`() {
        val userId = UUID.randomUUID()
        val bookingId = UUID.randomUUID()

        every { bookingRepository.findByIdAndUserId(bookingId, userId) } returns null

        assertThrows<BookingNotFoundException> {
            service.cancelBooking(userId, bookingId)
        }
    }

    // --- admin on-behalf booking (retained path, no ALREADY_BOOKED) ---

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

    // --- searchBookingMembers / getMyBookings ---

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

    // --- getAdminUserBookings ---

    @Test
    fun `get admin user bookings throws when user is unknown`() {
        val userId = UUID.randomUUID()

        every { userRepository.findByIdAndRoleAndDeletedAtIsNull(userId, "USER") } returns null

        assertThrows<UserNotFoundException> {
            service.getAdminUserBookings(userId, null, PageRequest.of(0, 20))
        }
    }

    @Test
    fun `get admin user bookings rejects invalid status filter`() {
        val userId = UUID.randomUUID()
        val user = User(id = userId, email = "member@example.com", passwordHash = "hash", role = "USER")

        every { userRepository.findByIdAndRoleAndDeletedAtIsNull(userId, "USER") } returns user

        assertThrows<InvalidBookingStatusException> {
            service.getAdminUserBookings(userId, "pending", PageRequest.of(0, 20))
        }
    }

    @Test
    fun `get admin user bookings returns paged history for a known user`() {
        val userId = UUID.randomUUID()
        val user = User(id = userId, email = "member@example.com", passwordHash = "hash", role = "USER")
        val pageable = PageRequest.of(0, 20)
        val item = AdminUserBookingHistoryItemResponse(
            bookingId = UUID.randomUUID(),
            classInstanceId = UUID.randomUUID(),
            className = "Yoga Flow",
            scheduledAt = OffsetDateTime.parse("2026-04-06T16:00:00Z"),
            status = "CONFIRMED",
            bookedAt = OffsetDateTime.parse("2026-04-04T12:15:00Z"),
            cancelledAt = null
        )

        every { userRepository.findByIdAndRoleAndDeletedAtIsNull(userId, "USER") } returns user
        every { bookingRepository.findAdminUserBookingHistory(userId, null, pageable) } returns PageImpl(listOf(item), pageable, 1)

        val page = service.getAdminUserBookings(userId, null, pageable)

        assertEquals(1, page.totalElements)
        assertEquals("Yoga Flow", page.content.first().className)
    }

    // --- getClassAttendees ---

    @Test
    fun `get class attendees throws when class instance is unknown`() {
        val classId = UUID.randomUUID()

        every { classInstanceRepository.findWithDetailsById(classId) } returns null

        assertThrows<ClassInstanceNotFoundException> {
            service.getClassAttendees(classId, null, PageRequest.of(0, 50))
        }
    }

    @Test
    fun `get class attendees skips soft-deleted class instances`() {
        val classInstance = buildFutureClass().copy(deletedAt = OffsetDateTime.now(ZoneOffset.UTC))

        every { classInstanceRepository.findWithDetailsById(classInstance.id) } returns classInstance

        assertThrows<ClassInstanceNotFoundException> {
            service.getClassAttendees(classInstance.id, null, PageRequest.of(0, 50))
        }
    }

    @Test
    fun `get class attendees rejects invalid status filter`() {
        val classInstance = buildFutureClass()

        every { classInstanceRepository.findWithDetailsById(classInstance.id) } returns classInstance
        every { bookingRepository.countConfirmedByClassId(classInstance.id) } returns 0

        assertThrows<InvalidBookingStatusException> {
            service.getClassAttendees(classInstance.id, "pending", PageRequest.of(0, 50))
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
