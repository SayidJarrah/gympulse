package com.gymflow.service

import com.gymflow.domain.Trainer
import com.gymflow.exception.InvalidSortFieldException
import com.gymflow.exception.MembershipRequiredException
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.TrainerRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserTrainerFavoriteRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import io.mockk.slot
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import java.time.DayOfWeek
import java.util.UUID

class TrainerDiscoveryServiceTest {

    private val trainerRepository: TrainerRepository = mockk()
    private val userTrainerFavoriteRepository: UserTrainerFavoriteRepository = mockk()
    private val userMembershipRepository: UserMembershipRepository = mockk()
    private val classInstanceRepository: ClassInstanceRepository = mockk()

    private lateinit var trainerDiscoveryService: TrainerDiscoveryService

    private val userId = UUID.randomUUID()
    private val trainerId1 = UUID.randomUUID()
    private val trainerId2 = UUID.randomUUID()
    private val trainerId3 = UUID.randomUUID()

    private val trainer1 = Trainer(
        id = trainerId1,
        firstName = "Jane",
        lastName = "Smith",
        email = "jane@example.com",
        specialisations = listOf("Yoga", "Pilates"),
        experienceYears = 5,
        photoData = "photo".toByteArray()
    )

    private val trainer2 = Trainer(
        id = trainerId2,
        firstName = "John",
        lastName = "Doe",
        email = "john@example.com",
        specialisations = listOf("Weights"),
        experienceYears = 10,
        profilePhotoUrl = "https://example.com/john.jpg"
    )

    private val trainer3 = Trainer(
        id = trainerId3,
        firstName = "Alice",
        lastName = "Brown",
        email = "alice@example.com",
        specialisations = listOf("Cardio"),
        experienceYears = null
    )

    @BeforeEach
    fun setUp() {
        trainerDiscoveryService = TrainerDiscoveryService(
            trainerRepository,
            userTrainerFavoriteRepository,
            userMembershipRepository,
            classInstanceRepository
        )
    }

    @Test
    @DisplayName("should list trainers with default sort and no filters")
    fun listTrainersDefault() {
        val pageable = PageRequest.of(0, 12, Sort.by(Sort.Direction.ASC, "lastName").and(Sort.by("id")))
        val trainersPage = PageImpl(listOf(trainer3, trainer1, trainer2), pageable, 3)

        every { trainerRepository.findAllByDeletedAtIsNull(any()) } returns trainersPage
        every { classInstanceRepository.countScheduledClassesForTrainers(any()) } returns listOf(
            arrayOf(trainerId1, 3L),
            arrayOf(trainerId2, 5L),
            arrayOf(trainerId3, 0L)
        )
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true
        every { userTrainerFavoriteRepository.findFavoritedTrainerIds(userId, any()) } returns setOf(trainerId1)

        val result = trainerDiscoveryService.listTrainers(null, "lastName,asc", pageable, userId)

        assertEquals(3, result.totalElements)
        assertEquals(3, result.content.size)
        assertEquals(trainerId3, result.content[0].id)
        assertTrue(result.content[0].profilePhotoUrl == null)
        assertEquals(trainerId1, result.content[1].id)
        assertEquals("/api/v1/trainers/$trainerId1/photo", result.content[1].profilePhotoUrl)
        assertTrue(result.content[1].isFavorited)
        assertEquals(trainerId2, result.content[2].id)
        assertEquals("https://example.com/john.jpg", result.content[2].profilePhotoUrl)
        assertFalse(result.content[2].isFavorited)
        assertEquals(0, result.content[0].classCount)
        assertEquals(3, result.content[1].classCount)
        assertEquals(5, result.content[2].classCount)

        verify(exactly = 1) { trainerRepository.findAllByDeletedAtIsNull(pageable) }
        verify(exactly = 1) { classInstanceRepository.countScheduledClassesForTrainers(setOf(trainerId3, trainerId1, trainerId2)) }
        verify(exactly = 1) { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 1) { userTrainerFavoriteRepository.findFavoritedTrainerIds(userId, any()) }
    }

    @Test
    @DisplayName("should list trainers filtered by specialization")
    fun listTrainersWithSpecializationFilter() {
        val pageable = PageRequest.of(0, 12, Sort.by(Sort.Direction.ASC, "lastName").and(Sort.by("id")))
        val trainersPage = PageImpl(listOf(trainer1), pageable, 1)
        val specializations = listOf("Yoga")
        val lowerCaseSpecializations = listOf("yoga")

        every { trainerRepository.findBySpecializations(lowerCaseSpecializations, any()) } returns trainersPage
        every { classInstanceRepository.countScheduledClassesForTrainers(any()) } returns listOf(
            arrayOf(trainerId1, 3L)
        )
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns false
        // No favorites check if user not active member

        val result = trainerDiscoveryService.listTrainers(specializations, "lastName,asc", pageable, userId)

        assertEquals(1, result.totalElements)
        assertEquals(trainerId1, result.content[0].id)
        assertFalse(result.content[0].isFavorited)

        verify(exactly = 1) { trainerRepository.findBySpecializations(lowerCaseSpecializations, pageable) }
        verify(exactly = 1) { classInstanceRepository.countScheduledClassesForTrainers(setOf(trainerId1)) }
        verify(exactly = 1) { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 0) { userTrainerFavoriteRepository.findFavoritedTrainerIds(any(), any()) }
    }

    @Test
    @DisplayName("should get trainer profile with availability and favorited status")
    fun getTrainerProfile() {
        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId1) } returns trainer1
        every { classInstanceRepository.countScheduledClassesForTrainers(setOf(trainerId1)) } returns listOf(
            arrayOf(trainerId1, 2L)
        )
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true
        every { userTrainerFavoriteRepository.existsByUserIdAndTrainerId(userId, trainerId1) } returns true
        every { classInstanceRepository.findScheduledDayHoursByTrainer(trainerId1) } returns listOf(
            arrayOf(2, 7), // Tuesday MORNING
            arrayOf(4, 13) // Thursday AFTERNOON
        )

        val result = trainerDiscoveryService.getTrainerProfile(trainerId1, userId)

        assertEquals(trainerId1, result.id)
        assertEquals(2, result.classCount)
        assertTrue(result.isFavorited)
        assertEquals("/api/v1/trainers/$trainerId1/photo", result.profilePhotoUrl)
        assertEquals(7, result.availabilityPreview.size)
        assertEquals(listOf("MORNING"), result.availabilityPreview["TUESDAY"])
        assertEquals(listOf("AFTERNOON"), result.availabilityPreview["THURSDAY"])
        assertTrue(result.availabilityPreview["MONDAY"]!!.isEmpty())

        verify(exactly = 1) { trainerRepository.findByIdAndDeletedAtIsNull(trainerId1) }
        verify(exactly = 1) { classInstanceRepository.countScheduledClassesForTrainers(setOf(trainerId1)) }
        verify(exactly = 1) { userTrainerFavoriteRepository.existsByUserIdAndTrainerId(userId, trainerId1) }
        verify(exactly = 1) { classInstanceRepository.findScheduledDayHoursByTrainer(trainerId1) }
    }

    @Test
    @DisplayName("should throw TrainerNotFoundException if trainer not found in profile")
    fun getTrainerProfileNotFound() {
        every { trainerRepository.findByIdAndDeletedAtIsNull(any()) } returns null

        assertThrows<TrainerNotFoundException> {
            trainerDiscoveryService.getTrainerProfile(trainerId1, userId)
        }

        verify(exactly = 1) { trainerRepository.findByIdAndDeletedAtIsNull(trainerId1) }
    }

    @Test
    @DisplayName("should return empty availability preview if no classes scheduled")
    fun getTrainerProfileEmptyAvailability() {
        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId1) } returns trainer1
        every { classInstanceRepository.countScheduledClassesForTrainers(setOf(trainerId1)) } returns listOf()
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true
        every { userTrainerFavoriteRepository.existsByUserIdAndTrainerId(userId, trainerId1) } returns false
        every { classInstanceRepository.findScheduledDayHoursByTrainer(trainerId1) } returns listOf()

        val result = trainerDiscoveryService.getTrainerProfile(trainerId1, userId)

        assertEquals(trainerId1, result.id)
        assertEquals(0, result.classCount)
        assertFalse(result.isFavorited)
        assertEquals(7, result.availabilityPreview.size)
        DayOfWeek.values().forEach { day ->
            assertTrue(result.availabilityPreview[day.name]!!.isEmpty())
        }

        verify(exactly = 1) { trainerRepository.findByIdAndDeletedAtIsNull(trainerId1) }
        verify(exactly = 1) { classInstanceRepository.countScheduledClassesForTrainers(setOf(trainerId1)) }
        verify(exactly = 1) { userTrainerFavoriteRepository.existsByUserIdAndTrainerId(userId, trainerId1) }
        verify(exactly = 1) { classInstanceRepository.findScheduledDayHoursByTrainer(trainerId1) }
    }

    @Test
    @DisplayName("should get favorite trainers for an active member")
    fun getFavoriteTrainersActiveMember() {
        val pageable = PageRequest.of(0, 12, Sort.by(Sort.Direction.ASC, "lastName").and(Sort.by("id")))
        val trainersPage = PageImpl(listOf(trainer2, trainer1), pageable, 2)

        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true
        every { trainerRepository.findFavoritesByUserId(userId, any()) } returns trainersPage
        every { classInstanceRepository.countScheduledClassesForTrainers(any()) } returns listOf(
            arrayOf(trainerId1, 3L),
            arrayOf(trainerId2, 5L)
        )

        val result = trainerDiscoveryService.getFavoriteTrainers("lastName,asc", pageable, userId)

        assertEquals(2, result.totalElements)
        assertEquals(2, result.content.size)
        assertEquals(trainerId2, result.content[0].id) // Order should follow trainer sort
        assertEquals(trainerId1, result.content[1].id)
        assertTrue(result.content[0].isFavorited)
        assertTrue(result.content[1].isFavorited)

        verify(exactly = 1) { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 1) { trainerRepository.findFavoritesByUserId(userId, pageable) }
        verify(exactly = 1) { classInstanceRepository.countScheduledClassesForTrainers(setOf(trainerId2, trainerId1)) }
    }

    @Test
    @DisplayName("should throw MembershipRequiredException if user is not an active member when getting favorites")
    fun getFavoriteTrainersNotActiveMember() {
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns false

        assertThrows<MembershipRequiredException> {
            trainerDiscoveryService.getFavoriteTrainers("lastName,asc", PageRequest.of(0, 12), userId)
        }

        verify(exactly = 1) { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 0) { trainerRepository.findFavoritesByUserId(any(), any()) }
    }

    @Test
    @DisplayName("should validate sort field successfully for allowed fields")
    fun validateSortSuccess() {
        trainerDiscoveryService.validateSort("lastName")
        trainerDiscoveryService.validateSort("experienceYears")
        // No exception should be thrown
    }

    @Test
    @DisplayName("should throw InvalidSortFieldException for an invalid sort field")
    fun validateSortFailure() {
        assertThrows<InvalidSortFieldException> {
            trainerDiscoveryService.validateSort("invalidField")
        }
    }

    @Test
    @DisplayName("should map PostgreSQL DOW 0 (Sunday) to Java DayOfWeek 7 (Sunday)")
    fun getAvailabilityPreviewSundayMapping() {
        every { classInstanceRepository.findScheduledDayHoursByTrainer(trainerId1) } returns listOf(
            arrayOf(0, 7) // Sunday MORNING (PostgreSQL DOW 0)
        )
        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId1) } returns trainer1 // Required for profile call
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true
        every { userTrainerFavoriteRepository.existsByUserIdAndTrainerId(any(),any()) } returns false // Required for profile call
        every { classInstanceRepository.countScheduledClassesForTrainers(any()) } returns emptyList() // Required for profile call

        val result = trainerDiscoveryService.getTrainerProfile(trainerId1, userId)

        assertEquals(listOf("MORNING"), result.availabilityPreview["SUNDAY"])
        verify(exactly = 1) { classInstanceRepository.findScheduledDayHoursByTrainer(trainerId1) }
    }

    @Test
    @DisplayName("should handle sort direction properly for experienceYears")
    fun listTrainersSortByExperienceYearsDesc() {
        val pageable = PageRequest.of(0, 12, Sort.by(Sort.Direction.DESC, "experienceYears").and(Sort.by("id")))
        val trainersPage = PageImpl(listOf(trainer2, trainer1, trainer3), pageable, 3)
        
        every { trainerRepository.findAllByDeletedAtIsNull(any()) } returns trainersPage
        every { classInstanceRepository.countScheduledClassesForTrainers(any()) } returns listOf(
            arrayOf(trainerId1, 3L),
            arrayOf(trainerId2, 5L),
            arrayOf(trainerId3, 0L)
        )
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true
        every { userTrainerFavoriteRepository.findFavoritedTrainerIds(userId, any()) } returns setOf(trainerId1)

        val result = trainerDiscoveryService.listTrainers(null, "experienceYears,desc", pageable, userId)

        assertEquals(3, result.totalElements)
        assertEquals(trainerId2, result.content[0].id)
        assertEquals(trainerId1, result.content[1].id)
        assertEquals(trainerId3, result.content[2].id)

        verify(exactly = 1) { trainerRepository.findAllByDeletedAtIsNull(any()) }
    }

    @Test
    @DisplayName("should apply NULLS LAST when sorting by experienceYears")
    fun listTrainersSortNullsLast() {
        val pageable = PageRequest.of(0, 12)
        val trainersPage = PageImpl(listOf(trainer2, trainer1, trainer3), pageable, 3)
        val pageableSlot = slot<Pageable>()

        every { trainerRepository.findAllByDeletedAtIsNull(capture(pageableSlot)) } returns trainersPage
        every { classInstanceRepository.countScheduledClassesForTrainers(any()) } returns listOf()
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns false

        trainerDiscoveryService.listTrainers(null, "experienceYears,asc", pageable, userId)

        val order = pageableSlot.captured.sort.getOrderFor("experienceYears")
        assertNotNull(order)
        assertEquals(Sort.NullHandling.NULLS_LAST, order?.nullHandling)
    }

    @Test
    @DisplayName("should throw InvalidSortFieldException for invalid sort format")
    fun listTrainersInvalidSortFormat() {
        assertThrows<InvalidSortFieldException> {
            trainerDiscoveryService.listTrainers(null, "lastName", PageRequest.of(0, 12), userId)
        }
    }

    @Test
    @DisplayName("should not mark favorites for inactive members on profile")
    fun getTrainerProfileInactiveMemberNotFavorited() {
        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId1) } returns trainer1
        every { classInstanceRepository.countScheduledClassesForTrainers(setOf(trainerId1)) } returns listOf()
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns false
        every { classInstanceRepository.findScheduledDayHoursByTrainer(trainerId1) } returns listOf()

        val result = trainerDiscoveryService.getTrainerProfile(trainerId1, userId)

        assertFalse(result.isFavorited)
        verify(exactly = 0) { userTrainerFavoriteRepository.existsByUserIdAndTrainerId(any(), any()) }
    }
}
