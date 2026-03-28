package com.gymflow.repository

import com.gymflow.domain.Trainer
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
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
}
