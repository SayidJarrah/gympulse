package com.gymflow.service

import com.gymflow.domain.Trainer
import com.gymflow.domain.UserTrainerFavorite
import com.gymflow.exception.AlreadyFavoritedException
import com.gymflow.exception.FavoriteNotFoundException
import com.gymflow.exception.MembershipRequiredException
import com.gymflow.repository.TrainerRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserTrainerFavoriteRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.util.UUID

class TrainerFavoriteServiceTest {

    private val trainerRepository: TrainerRepository = mockk()
    private val userTrainerFavoriteRepository: UserTrainerFavoriteRepository = mockk()
    private val userMembershipRepository: UserMembershipRepository = mockk()

    private lateinit var trainerFavoriteService: TrainerFavoriteService

    private val userId = UUID.randomUUID()
    private val trainerId = UUID.randomUUID()
    private val nonExistentTrainerId = UUID.randomUUID()

    private val trainer = Trainer(
        id = trainerId,
        firstName = "Jane",
        lastName = "Smith",
        email = "jane@example.com"
    )

    @BeforeEach
    fun setUp() {
        trainerFavoriteService = TrainerFavoriteService(
            trainerRepository,
            userTrainerFavoriteRepository,
            userMembershipRepository
        )
    }

    @Test
    @DisplayName("should add a trainer to favorites")
    fun addFavoriteSuccess() {
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true
        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId) } returns trainer
        every { userTrainerFavoriteRepository.existsByUserIdAndTrainerId(userId, trainerId) } returns false
        every { userTrainerFavoriteRepository.save(any<UserTrainerFavorite>()) } returnsArgument 0

        val result = trainerFavoriteService.addFavorite(userId, trainerId)

        assertEquals(trainerId, result.trainerId)
        assertEquals("Jane", result.firstName)
        assertEquals("Smith", result.lastName)

        verify(exactly = 1) { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 1) { trainerRepository.findByIdAndDeletedAtIsNull(trainerId) }
        verify(exactly = 1) { userTrainerFavoriteRepository.existsByUserIdAndTrainerId(userId, trainerId) }
        verify(exactly = 1) { userTrainerFavoriteRepository.save(any<UserTrainerFavorite>()) }
    }

    @Test
    @DisplayName("should throw MembershipRequiredException when adding favorite without active membership")
    fun addFavoriteNoActiveMembership() {
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns false

        assertThrows<MembershipRequiredException> {
            trainerFavoriteService.addFavorite(userId, trainerId)
        }

        verify(exactly = 1) { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 0) { trainerRepository.findByIdAndDeletedAtIsNull(any()) }
        verify(exactly = 0) { userTrainerFavoriteRepository.save(any()) }
    }

    @Test
    @DisplayName("should throw TrainerNotFoundException when adding favorite for non-existent trainer")
    fun addFavoriteTrainerNotFound() {
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true
        every { trainerRepository.findByIdAndDeletedAtIsNull(nonExistentTrainerId) } returns null

        assertThrows<TrainerNotFoundException> {
            trainerFavoriteService.addFavorite(userId, nonExistentTrainerId)
        }

        verify(exactly = 1) { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 1) { trainerRepository.findByIdAndDeletedAtIsNull(nonExistentTrainerId) }
        verify(exactly = 0) { userTrainerFavoriteRepository.save(any()) }
    }

    @Test
    @DisplayName("should throw AlreadyFavoritedException when adding duplicate favorite")
    fun addFavoriteAlreadyFavorited() {
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true
        every { trainerRepository.findByIdAndDeletedAtIsNull(trainerId) } returns trainer
        every { userTrainerFavoriteRepository.existsByUserIdAndTrainerId(userId, trainerId) } returns true

        assertThrows<AlreadyFavoritedException> {
            trainerFavoriteService.addFavorite(userId, trainerId)
        }

        verify(exactly = 1) { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 1) { trainerRepository.findByIdAndDeletedAtIsNull(trainerId) }
        verify(exactly = 1) { userTrainerFavoriteRepository.existsByUserIdAndTrainerId(userId, trainerId) }
        verify(exactly = 0) { userTrainerFavoriteRepository.save(any<UserTrainerFavorite>()) }
    }

    @Test
    @DisplayName("should remove a trainer from favorites")
    fun removeFavoriteSuccess() {
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true
        every { userTrainerFavoriteRepository.deleteByUserIdAndTrainerId(userId, trainerId) } returns 1

        trainerFavoriteService.removeFavorite(userId, trainerId)

        verify(exactly = 1) { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 1) { userTrainerFavoriteRepository.deleteByUserIdAndTrainerId(userId, trainerId) }
    }

    @Test
    @DisplayName("should throw MembershipRequiredException when removing favorite without active membership")
    fun removeFavoriteNoActiveMembership() {
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns false

        assertThrows<MembershipRequiredException> {
            trainerFavoriteService.removeFavorite(userId, trainerId)
        }

        verify(exactly = 1) { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 0) { userTrainerFavoriteRepository.deleteByUserIdAndTrainerId(any(), any()) }
    }

    @Test
    @DisplayName("should throw FavoriteNotFoundException when removing non-existent favorite")
    fun removeFavoriteNotFound() {
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true
        every { userTrainerFavoriteRepository.deleteByUserIdAndTrainerId(userId, trainerId) } returns 0

        assertThrows<FavoriteNotFoundException> {
            trainerFavoriteService.removeFavorite(userId, trainerId)
        }

        verify(exactly = 1) { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 1) { userTrainerFavoriteRepository.deleteByUserIdAndTrainerId(userId, trainerId) }
    }
}
