package com.gymflow.service

import com.gymflow.domain.ClassInstance
import com.gymflow.domain.ClassTemplate
import com.gymflow.domain.Trainer
import com.gymflow.exception.MemberHomeInvalidTimeZoneException
import com.gymflow.repository.ClassInstanceRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.util.UUID

class MemberHomeServiceTest {

    private val classInstanceRepository: ClassInstanceRepository = mockk()

    private lateinit var service: MemberHomeService

    @BeforeEach
    fun setUp() {
        service = MemberHomeService(classInstanceRepository)
    }

    @Test
    fun `throws when time zone is invalid`() {
        val exception = assertThrows<MemberHomeInvalidTimeZoneException> {
            service.getUpcomingClassesPreview("Not/AZone")
        }

        assertTrue(exception.message!!.contains("Invalid timeZone"))
    }

    @Test
    fun `throws when time zone is null`() {
        assertThrows<MemberHomeInvalidTimeZoneException> {
            service.getUpcomingClassesPreview(null)
        }
    }

    @Test
    fun `throws when time zone is blank`() {
        assertThrows<MemberHomeInvalidTimeZoneException> {
            service.getUpcomingClassesPreview("")
        }
    }

    @Test
    fun `empty result keeps 14 day preview window`() {
        val timeZone = "Europe/Warsaw"
        val zoneId = ZoneId.of(timeZone)
        val rangeEndSlot = slot<OffsetDateTime>()

        every { classInstanceRepository.findUpcomingGroupPreviewIds(capture(rangeEndSlot)) } returns emptyList()

        val response = service.getUpcomingClassesPreview(timeZone)

        assertEquals(timeZone, response.timeZone)
        assertEquals(LocalDate.now(zoneId), response.rangeStartDate)
        assertEquals(LocalDate.now(zoneId).plusDays(14), response.rangeEndDateExclusive)
        assertTrue(response.entries.isEmpty())
        assertEquals(
            response.rangeEndDateExclusive.atStartOfDay(zoneId).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC),
            rangeEndSlot.captured
        )

        verify(exactly = 1) { classInstanceRepository.findUpcomingGroupPreviewIds(any()) }
        verify(exactly = 0) { classInstanceRepository.findPreviewDetailsByIds(any()) }
    }

    @Test
    fun `uses trainer tba when no trainer is assigned`() {
        val previewId = UUID.randomUUID()
        val instance = buildInstance(
            id = previewId,
            scheduledAt = OffsetDateTime.parse("2026-04-05T16:00:00Z"),
            trainers = emptySet()
        )

        every { classInstanceRepository.findUpcomingGroupPreviewIds(any()) } returns listOf(previewId)
        every { classInstanceRepository.findPreviewDetailsByIds(listOf(previewId)) } returns listOf(instance)

        val response = service.getUpcomingClassesPreview("Europe/Warsaw")

        assertEquals(1, response.entries.size)
        assertEquals("Trainer TBA", response.entries.first().trainerDisplayName)
    }

    @Test
    fun `uses alphabetical lead trainer with suffix when multiple trainers are assigned`() {
        val previewId = UUID.randomUUID()
        val trainerA = Trainer(
            id = UUID.randomUUID(),
            firstName = "Anna",
            lastName = "Nowak",
            email = "anna@example.com"
        )
        val trainerB = Trainer(
            id = UUID.randomUUID(),
            firstName = "Jane",
            lastName = "Smith",
            email = "jane@example.com"
        )
        val trainerC = Trainer(
            id = UUID.randomUUID(),
            firstName = "Beata",
            lastName = "Smith",
            email = "beata@example.com"
        )
        val instance = buildInstance(
            id = previewId,
            scheduledAt = OffsetDateTime.parse("2026-04-05T16:00:00Z"),
            trainers = setOf(trainerB, trainerC, trainerA)
        )

        every { classInstanceRepository.findUpcomingGroupPreviewIds(any()) } returns listOf(previewId)
        every { classInstanceRepository.findPreviewDetailsByIds(listOf(previewId)) } returns listOf(instance)

        val response = service.getUpcomingClassesPreview("Europe/Warsaw")

        assertEquals("Anna Nowak +2", response.entries.first().trainerDisplayName)
    }

    @Test
    fun `caps preview results at eight entries`() {
        val previewIds = (1..9).map { UUID.randomUUID() }
        val instances = previewIds.mapIndexed { index, id ->
            buildInstance(
                id = id,
                scheduledAt = OffsetDateTime.parse("2026-04-05T06:00:00Z").plusHours(index.toLong()),
                trainers = emptySet()
            )
        }

        every { classInstanceRepository.findUpcomingGroupPreviewIds(any()) } returns previewIds
        every { classInstanceRepository.findPreviewDetailsByIds(previewIds) } returns instances

        val response = service.getUpcomingClassesPreview("Europe/Warsaw")

        assertEquals(8, response.entries.size)
        assertEquals(previewIds.take(8), response.entries.map { it.id })
    }

    @Test
    fun `orders preview entries by scheduled time ascending`() {
        val firstId = UUID.randomUUID()
        val secondId = UUID.randomUUID()
        val thirdId = UUID.randomUUID()

        val later = buildInstance(
            id = thirdId,
            scheduledAt = OffsetDateTime.parse("2026-04-07T16:00:00Z"),
            trainers = emptySet(),
            template = buildTemplate(withPhoto = true)
        )
        val earliest = buildInstance(
            id = firstId,
            scheduledAt = OffsetDateTime.parse("2026-04-05T07:00:00Z"),
            trainers = emptySet()
        )
        val middle = buildInstance(
            id = secondId,
            scheduledAt = OffsetDateTime.parse("2026-04-06T09:30:00Z"),
            trainers = emptySet()
        )

        every { classInstanceRepository.findUpcomingGroupPreviewIds(any()) } returns listOf(firstId, secondId, thirdId)
        every { classInstanceRepository.findPreviewDetailsByIds(listOf(firstId, secondId, thirdId)) } returns listOf(later, earliest, middle)

        val response = service.getUpcomingClassesPreview("Pacific/Honolulu")

        assertEquals(listOf(firstId, secondId, thirdId), response.entries.map { it.id })
        assertEquals(LocalDate.parse("2026-04-04"), response.entries.first().localDate)
        assertEquals("/api/v1/class-templates/${later.template!!.id}/photo", response.entries.last().classPhotoUrl)
    }

    private fun buildInstance(
        id: UUID,
        scheduledAt: OffsetDateTime,
        trainers: Set<Trainer>,
        template: ClassTemplate? = null
    ) = ClassInstance(
        id = id,
        template = template,
        name = "Yoga Flow",
        type = "GROUP",
        status = "SCHEDULED",
        scheduledAt = scheduledAt,
        durationMin = 60,
        capacity = 12,
        trainers = trainers.toMutableSet()
    )

    private fun buildTemplate(withPhoto: Boolean) = ClassTemplate(
        id = UUID.randomUUID(),
        name = "Yoga Flow",
        category = "Mind & Body",
        defaultDurationMin = 60,
        defaultCapacity = 12,
        difficulty = "All Levels",
        photoData = if (withPhoto) byteArrayOf(1) else null,
        photoMimeType = if (withPhoto) "image/png" else null
    )
}
