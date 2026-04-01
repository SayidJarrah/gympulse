package com.gymflow.repository

import com.gymflow.domain.Trainer
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface TrainerRepository : JpaRepository<Trainer, UUID> {
    fun findByEmail(email: String): Trainer?

    @Query(
        """
        SELECT t FROM Trainer t
        WHERE (:search IS NULL OR :search = '')
           OR LOWER(t.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
           OR LOWER(t.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
           OR LOWER(t.email) LIKE LOWER(CONCAT('%', :search, '%'))
        """
    )
    fun findBySearch(search: String?, pageable: Pageable): Page<Trainer>

    fun findByIdAndDeletedAtIsNull(id: UUID): Trainer?

    @Query(
        value = """
        SELECT DISTINCT t.* FROM trainers t
        WHERE t.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM unnest(t.specialisations) AS s
            WHERE lower(s) IN (:lowerSpecs)
          )
        """,
        countQuery = """
        SELECT COUNT(*) FROM trainers t
        WHERE t.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM unnest(t.specialisations) AS s
            WHERE lower(s) IN (:lowerSpecs)
          )
        """,
        nativeQuery = true
    )
    fun findBySpecializations(
        @Param("lowerSpecs") lowerSpecs: List<String>?,
        pageable: Pageable
    ): Page<Trainer>

    fun findAllByDeletedAtIsNull(pageable: Pageable): Page<Trainer>

    @Query(
        """
        SELECT t FROM Trainer t
        JOIN UserTrainerFavorite f ON f.trainerId = t.id
        WHERE f.userId = :userId
          AND t.deletedAt IS NULL
        """
    )
    fun findFavoritesByUserId(
        @Param("userId") userId: UUID,
        pageable: Pageable
    ): Page<Trainer>
}
