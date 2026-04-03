package com.gymflow.repository

import com.gymflow.domain.UserTrainerFavorite
import com.gymflow.domain.UserTrainerFavoriteId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface UserTrainerFavoriteRepository : JpaRepository<UserTrainerFavorite, UserTrainerFavoriteId> {

    fun findAllByUserId(userId: UUID, pageable: Pageable): Page<UserTrainerFavorite>

    fun existsByUserIdAndTrainerId(userId: UUID, trainerId: UUID): Boolean

    @Query("SELECT f.trainerId FROM UserTrainerFavorite f WHERE f.userId = :userId AND f.trainerId IN :trainerIds")
    fun findFavoritedTrainerIds(
        @Param("userId") userId: UUID,
        @Param("trainerIds") trainerIds: Collection<UUID>
    ): Set<UUID>

    @Modifying
    @Query("DELETE FROM UserTrainerFavorite f WHERE f.userId = :userId AND f.trainerId = :trainerId")
    fun deleteByUserIdAndTrainerId(
        @Param("userId") userId: UUID,
        @Param("trainerId") trainerId: UUID
    ): Int
}
