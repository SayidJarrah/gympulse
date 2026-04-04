package com.gymflow.service

import com.gymflow.domain.ClassInstance
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.ClassTemplateRepository
import com.gymflow.repository.RoomRepository
import com.gymflow.repository.TrainerRepository
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Optional
import java.util.UUID

class ClassInstanceServiceTest {

    private val classInstanceRepository: ClassInstanceRepository = mockk()
    private val trainerRepository: TrainerRepository = mockk()
    private val roomRepository: RoomRepository = mockk()
    private val classTemplateRepository: ClassTemplateRepository = mockk()
    private val bookingService: BookingService = mockk()

    private lateinit var service: ClassInstanceService

    @BeforeEach
    fun setUp() {
        service = ClassInstanceService(
            classInstanceRepository,
            trainerRepository,
            roomRepository,
            classTemplateRepository,
            bookingService
        )
    }

    @Test
    fun `update instance rejects capacity below confirmed bookings`() {
        val instance = buildInstance(capacity = 12)

        every { classInstanceRepository.findWithDetailsById(instance.id) } returns instance
        every { bookingService.countConfirmedBookings(instance.id) } returns 8

        assertThrows<CapacityBelowConfirmedBookingsException> {
            service.updateInstance(instance.id, com.gymflow.dto.ClassInstancePatchRequest(capacity = 7))
        }
    }

    @Test
    fun `delete instance rejects active bookings`() {
        val instance = buildInstance()

        every { classInstanceRepository.findById(instance.id) } returns Optional.of(instance)
        every { bookingService.countConfirmedBookings(instance.id) } returns 1

        assertThrows<ClassHasActiveBookingsException> {
            service.deleteInstance(instance.id)
        }
    }

    private fun buildInstance(capacity: Int = 12) = ClassInstance(
        id = UUID.randomUUID(),
        name = "Yoga Flow",
        type = "GROUP",
        status = "SCHEDULED",
        scheduledAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(3),
        durationMin = 60,
        capacity = capacity
    )
}
