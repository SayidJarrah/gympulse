package com.gymflow.repository

import com.gymflow.domain.UserProfile
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface UserProfileRepository : JpaRepository<UserProfile, UUID> {

    @Query(
        """
        SELECT DISTINCT p.userId FROM UserProfile p
        WHERE p.deletedAt IS NULL
          AND (
            LOWER(COALESCE(p.firstName, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(p.lastName, '')) LIKE LOWER(CONCAT('%', :query, '%'))
          )
        """
    )
    fun findUserIdsByNameContainingIgnoreCase(@Param("query") query: String): List<UUID>
}
