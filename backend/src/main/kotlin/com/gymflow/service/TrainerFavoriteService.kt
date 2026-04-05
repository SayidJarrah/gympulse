package com.gymflow.service

import com.gymflow.domain.UserTrainerFavorite
import com.gymflow.dto.TrainerFavoriteResponse
import com.gymflow.exception.AlreadyFavoritedException
import com.gymflow.exception.FavoriteNotFoundException
import com.gymflow.exception.MembershipRequiredException
import com.gymflow.repository.TrainerRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserTrainerFavoriteRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional
class TrainerFavoriteService(
    private val trainerRepository: TrainerRepository,
    private val userTrainerFavoriteRepository: UserTrainerFavoriteRepository,
    private val userMembershipRepository: UserMembershipRepository
) {

    fun addFavorite(userId: UUID, trainerId: UUID): TrainerFavoriteResponse {
        requireActiveMembership(userId)
        val trainer = trainerRepository.findByIdAndDeletedAtIsNull(trainerId)
            ?: throw TrainerNotFoundException("Trainer with id '$trainerId' not found")
        if (userTrainerFavoriteRepository.existsByUserIdAndTrainerId(userId, trainerId)) {
            throw AlreadyFavoritedException(trainerId)
        }
        userTrainerFavoriteRepository.save(UserTrainerFavorite(userId = userId, trainerId = trainerId))
        return TrainerFavoriteResponse(
            trainerId = trainer.id,
            firstName = trainer.firstName,
            lastName = trainer.lastName
        )
    }

    fun removeFavorite(userId: UUID, trainerId: UUID) {
        requireActiveMembership(userId)
        val deleted = userTrainerFavoriteRepository.deleteByUserIdAndTrainerId(userId, trainerId)
        if (deleted == 0) throw FavoriteNotFoundException(trainerId)
    }

    private fun requireActiveMembership(userId: UUID) {
        if (!userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE")) {
            throw MembershipRequiredException()
        }
    }
}
