package com.gymflow.service

import com.gymflow.domain.ClassInstance
import com.gymflow.domain.PtBooking
import com.gymflow.domain.Trainer
import com.gymflow.dto.PtBookingRequest
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.PtBookingRepository
import com.gymflow.repository.TrainerRepository
import com.gymflow.repository.UserProfileRepository
import com.gymflow.repository.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

class PtBookingServiceTest {

    private val ptBookingRepository: PtBookingRepository = mockk()
    private val trainerRepository: TrainerRepository = mockk()
    private val classInstanceRepository: ClassInstanceRepository = mockk()
    private val userRepository: UserRepository = mockk()
    private val userProfileRepository: UserProfileRepository = mockk()

    private lateinit var service: PtBookingService

    private val trainerId = UUID.randomUUID()
    private val memberId = UUID.randomUUID()
    private val bookingId = UUID.randomUUID()

    @BeforeEach
    fun setUp() {
        service = PtBookingService(
            ptBookingRepository,
            trainerRepository,
            classInstanceRepository,
            userRepository,
            userProfileRepository,
            gymOpenHour = 6,
            gymCloseHour = 22,
            leadTimeHours = 24
        )
    }

    // ─── createBooking — happy path ───────────────────────────────────────────

    @Test
    fun `createBooking succeeds and persists correct booking`() {
        val startAt = OffsetDateTime.now(ZoneOffset.UTC).plusHours(25).withMinute(0).withSecond(0).withNano(0)
        val adjustedStart = if (startAt.hour < 6) startAt.plusDays(1).withHour(8)
                            else if (startAt.hour >= 22) startAt.plusDays(1).withHour(8)
                            else startAt
        val request = PtBookingRequest(trainerId = trainerId, startAt = adjustedStart)
        val trainer = buildTrainer(trainerId)

        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId) } returns trainer
        every { ptBookingRepository.countTrainerOverlap(trainerId, any(), any()) } returns 0
        every { classInstanceRepository.findTrainerOverlaps(trainerId, any(), any()) } returns emptyList()
        every { ptBookingRepository.save(any()) } answers { firstArg<PtBooking>() }
        every { userProfileRepository.findById(memberId) } returns java.util.Optional.empty()

        val response = service.createBooking(memberId, request)

        assertEquals("CONFIRMED", response.status)
        assertEquals(trainerId, response.trainerId)
        assertEquals(memberId, response.memberId)
        assertEquals(adjustedStart, response.startAt)
        assertEquals(adjustedStart.plusHours(1), response.endAt)
        verify(exactly = 1) { ptBookingRepository.save(any()) }
    }

    // ─── createBooking — 24h lead time violation ──────────────────────────────

    @Test
    fun `createBooking throws PtLeadTimeViolationException when slot is less than 24h away`() {
        val startAt = OffsetDateTime.now(ZoneOffset.UTC).plusHours(10).withMinute(0).withSecond(0).withNano(0)
        val request = PtBookingRequest(trainerId = trainerId, startAt = startAt)
        val trainer = buildTrainer(trainerId)

        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId) } returns trainer

        assertThrows<PtLeadTimeViolationException> {
            service.createBooking(memberId, request)
        }
        verify(exactly = 0) { ptBookingRepository.save(any()) }
    }

    // ─── createBooking — PT trainer overlap ──────────────────────────────────

    @Test
    fun `createBooking throws PtTrainerOverlapException when trainer already has PT booking`() {
        val startAt = OffsetDateTime.now(ZoneOffset.UTC).plusHours(25).withMinute(0).withSecond(0).withNano(0)
        val adjustedStart = ensureInGymHours(startAt)
        val request = PtBookingRequest(trainerId = trainerId, startAt = adjustedStart)
        val trainer = buildTrainer(trainerId)

        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId) } returns trainer
        every { ptBookingRepository.countTrainerOverlap(trainerId, any(), any()) } returns 1

        assertThrows<PtTrainerOverlapException> {
            service.createBooking(memberId, request)
        }
    }

    // ─── createBooking — class overlap ───────────────────────────────────────

    @Test
    fun `createBooking throws PtTrainerClassOverlapException when trainer has group class`() {
        val startAt = OffsetDateTime.now(ZoneOffset.UTC).plusHours(25).withMinute(0).withSecond(0).withNano(0)
        val adjustedStart = ensureInGymHours(startAt)
        val request = PtBookingRequest(trainerId = trainerId, startAt = adjustedStart)
        val trainer = buildTrainer(trainerId)
        val conflict = buildClassInstance(trainerId, adjustedStart)

        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId) } returns trainer
        every { ptBookingRepository.countTrainerOverlap(trainerId, any(), any()) } returns 0
        every { classInstanceRepository.findTrainerOverlaps(trainerId, any(), any()) } returns listOf(conflict)

        assertThrows<PtTrainerClassOverlapException> {
            service.createBooking(memberId, request)
        }
    }

    // ─── createBooking — outside gym hours ───────────────────────────────────

    @Test
    fun `createBooking throws PtOutsideGymHoursException for slot before gym opens`() {
        val startAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(2).withHour(4).withMinute(0).withSecond(0).withNano(0)
        val request = PtBookingRequest(trainerId = trainerId, startAt = startAt)
        val trainer = buildTrainer(trainerId)

        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId) } returns trainer

        assertThrows<PtOutsideGymHoursException> {
            service.createBooking(memberId, request)
        }
    }

    @Test
    fun `createBooking throws PtOutsideGymHoursException for slot at or after gym close`() {
        val startAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(2).withHour(22).withMinute(0).withSecond(0).withNano(0)
        val request = PtBookingRequest(trainerId = trainerId, startAt = startAt)
        val trainer = buildTrainer(trainerId)

        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId) } returns trainer

        assertThrows<PtOutsideGymHoursException> {
            service.createBooking(memberId, request)
        }
    }

    // ─── cancelBooking ────────────────────────────────────────────────────────

    @Test
    fun `cancelBooking marks booking as CANCELLED`() {
        val booking = buildBooking(bookingId, trainerId, memberId, status = "CONFIRMED")
        val trainer = buildTrainer(trainerId)

        every { ptBookingRepository.findByIdAndMemberId(bookingId, memberId) } returns booking
        every { ptBookingRepository.save(any()) } answers { firstArg<PtBooking>() }
        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId) } returns trainer
        every { userProfileRepository.findById(memberId) } returns java.util.Optional.empty()

        val response = service.cancelBooking(memberId, bookingId)

        assertEquals("CANCELLED", response.status)
        assertNotNull(response.cancelledAt)
    }

    @Test
    fun `cancelBooking throws PtBookingNotFoundException when booking not found`() {
        every { ptBookingRepository.findByIdAndMemberId(bookingId, memberId) } returns null

        assertThrows<PtBookingNotFoundException> {
            service.cancelBooking(memberId, bookingId)
        }
    }

    @Test
    fun `cancelBooking throws PtBookingNotActiveException when already cancelled`() {
        val booking = buildBooking(bookingId, trainerId, memberId, status = "CANCELLED")
        booking.cancelledAt = OffsetDateTime.now(ZoneOffset.UTC)

        every { ptBookingRepository.findByIdAndMemberId(bookingId, memberId) } returns booking

        assertThrows<PtBookingNotActiveException> {
            service.cancelBooking(memberId, bookingId)
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private fun buildTrainer(id: UUID) = Trainer(
        id = id,
        firstName = "Priya",
        lastName = "Mendes",
        email = "priya@gymflow.test",
        specialisations = listOf("Mobility"),
        defaultRoom = "Studio B"
    )

    private fun buildBooking(
        id: UUID,
        trainerId: UUID,
        memberId: UUID,
        status: String = "CONFIRMED"
    ): PtBooking {
        val start = OffsetDateTime.now(ZoneOffset.UTC).plusHours(26).withMinute(0).withSecond(0).withNano(0)
        return PtBooking(
            id = id,
            trainerId = trainerId,
            memberId = memberId,
            startAt = start,
            endAt = start.plusHours(1),
            status = status
        )
    }

    private fun buildClassInstance(trainerId: UUID, scheduledAt: OffsetDateTime): ClassInstance {
        return ClassInstance(
            name = "HIIT Burn",
            scheduledAt = scheduledAt,
            durationMin = 60,
            capacity = 20
        )
    }

    private fun ensureInGymHours(dt: OffsetDateTime): OffsetDateTime {
        val hour = dt.hour
        return if (hour < 6 || hour >= 22) {
            dt.plusDays(1).withHour(8)
        } else dt
    }
}
