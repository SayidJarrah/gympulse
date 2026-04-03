package com.gymflow.service

import com.gymflow.domain.ClassInstance
import com.gymflow.domain.ClassTemplate
import com.gymflow.domain.Trainer
import com.gymflow.domain.UserMembership
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.UserMembershipRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

class UserClassScheduleServiceTest {

    private val classInstanceRepository: ClassInstanceRepository = mockk()
    private val userMembershipRepository: UserMembershipRepository = mockk()

    private lateinit var service: UserClassScheduleService

    private val userId = UUID.randomUUID()

    @BeforeEach
    fun setUp() {
        service = UserClassScheduleService(classInstanceRepository, userMembershipRepository)
    }

    @Test
    fun `week view calculates range and sorts trainer names`() {
        val anchorDate = "2026-03-30"
        val timeZone = "Europe/Warsaw"
        val today = LocalDate.now()
        val membership = buildMembership(endDate = today.plusDays(5))

        val trainerA = Trainer(
            id = UUID.randomUUID(),
            firstName = "Jane",
            lastName = "Doe",
            email = "jane@example.com"
        )
        val trainerB = Trainer(
            id = UUID.randomUUID(),
            firstName = "Marta",
            lastName = "Kowalska",
            email = "marta@example.com"
        )

        val instance = ClassInstance(
            id = UUID.randomUUID(),
            template = ClassTemplate(
                id = UUID.randomUUID(),
                name = "Yoga Flow",
                category = "Mind & Body",
                defaultDurationMin = 60,
                defaultCapacity = 12,
                difficulty = "All Levels",
                photoData = byteArrayOf(9),
                photoMimeType = "image/png"
            ),
            name = "Yoga Flow",
            type = "GROUP",
            status = "SCHEDULED",
            scheduledAt = OffsetDateTime.parse("2026-03-30T16:00:00Z"),
            durationMin = 60,
            capacity = 12,
            trainers = mutableSetOf(trainerB, trainerA)
        )

        every { userMembershipRepository.findAccessibleActiveMembership(userId, today) } returns membership
        every { classInstanceRepository.findVisibleGroupScheduleBetween(any(), any()) } returns listOf(instance)

        val response = service.getSchedule(userId, "week", anchorDate, timeZone)

        assertEquals("week", response.view)
        assertEquals(LocalDate.of(2026, 3, 30), response.rangeStartDate)
        assertEquals(LocalDate.of(2026, 4, 6), response.rangeEndDateExclusive)
        assertEquals("2026-W14", response.week)
        assertEquals(1, response.entries.size)
        assertEquals(listOf("Jane Doe", "Marta Kowalska"), response.entries[0].trainerNames)
        assertEquals(
            "/api/v1/class-templates/${instance.template!!.id}/photo",
            response.entries[0].classPhotoUrl
        )

        verify(exactly = 1) { userMembershipRepository.findAccessibleActiveMembership(userId, today) }
        verify(exactly = 1) { classInstanceRepository.findVisibleGroupScheduleBetween(any(), any()) }
    }

    @Test
    fun `list view keeps local dates aligned to device timezone`() {
        val anchorDate = "2026-03-30"
        val timeZone = "Pacific/Honolulu"
        val today = LocalDate.now()
        val membership = buildMembership(endDate = today.plusDays(3))

        val instance = ClassInstance(
            id = UUID.randomUUID(),
            name = "Sunrise Stretch",
            type = "GROUP",
            status = "SCHEDULED",
            scheduledAt = OffsetDateTime.parse("2026-03-31T05:00:00Z"),
            durationMin = 45,
            capacity = 10,
            trainers = mutableSetOf()
        )

        every { userMembershipRepository.findAccessibleActiveMembership(userId, today) } returns membership
        every { classInstanceRepository.findVisibleGroupScheduleBetween(any(), any()) } returns listOf(instance)

        val response = service.getSchedule(userId, "list", anchorDate, timeZone)

        assertEquals(LocalDate.of(2026, 3, 30), response.rangeStartDate)
        assertEquals(LocalDate.of(2026, 4, 13), response.rangeEndDateExclusive)
        assertEquals(LocalDate.of(2026, 3, 30), response.entries[0].localDate)
        assertEquals(null, response.entries[0].classPhotoUrl)
    }

    @Test
    fun `day view filters out non-visible instances`() {
        val anchorDate = "2026-03-31"
        val timeZone = "Europe/Warsaw"
        val today = LocalDate.now()
        val membership = buildMembership(endDate = today.plusDays(2))

        val visible = ClassInstance(
            id = UUID.randomUUID(),
            name = "Visible",
            type = "GROUP",
            status = "SCHEDULED",
            scheduledAt = OffsetDateTime.parse("2026-03-31T08:00:00Z"),
            durationMin = 60,
            capacity = 10
        )

        val cancelled = visible.copy(id = UUID.randomUUID(), status = "CANCELLED")
        val completed = visible.copy(id = UUID.randomUUID(), status = "COMPLETED")
        val personal = visible.copy(id = UUID.randomUUID(), type = "PERSONAL")
        val deleted = visible.copy(id = UUID.randomUUID(), deletedAt = OffsetDateTime.now(ZoneOffset.UTC))

        every { userMembershipRepository.findAccessibleActiveMembership(userId, today) } returns membership
        every { classInstanceRepository.findVisibleGroupScheduleBetween(any(), any()) } returns listOf(
            visible,
            cancelled,
            completed,
            personal,
            deleted
        )

        val response = service.getSchedule(userId, "day", anchorDate, timeZone)

        assertEquals(LocalDate.of(2026, 3, 31), response.rangeStartDate)
        assertEquals(LocalDate.of(2026, 4, 1), response.rangeEndDateExclusive)
        assertEquals(1, response.entries.size)
        assertEquals("Visible", response.entries[0].name)
        assertEquals(null, response.entries[0].classPhotoUrl)
    }

    @Test
    fun `throws when membership is not active`() {
        val today = LocalDate.now()
        every { userMembershipRepository.findAccessibleActiveMembership(userId, today) } returns null

        val exception = assertThrows<NoActiveMembershipException> {
            service.getSchedule(userId, "week", "2026-03-30", "Europe/Warsaw")
        }

        assertTrue(exception.message!!.contains("No active membership"))
    }

    private fun buildMembership(endDate: LocalDate): UserMembership = UserMembership(
        id = UUID.randomUUID(),
        userId = userId,
        planId = UUID.randomUUID(),
        status = "ACTIVE",
        startDate = endDate.minusDays(30),
        endDate = endDate,
        bookingsUsedThisMonth = 0,
        createdAt = OffsetDateTime.now(ZoneOffset.UTC),
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC)
    )
}
