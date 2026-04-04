package com.gymflow.repository

import com.gymflow.domain.User
import com.gymflow.dto.AdminBookingMemberSummaryResponse
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.util.UUID

@Repository
interface UserRepository : JpaRepository<User, UUID> {
    fun findByEmail(email: String): User?

    fun findByIdAndRoleAndDeletedAtIsNull(id: UUID, role: String): User?

    fun findAllByEmailStartingWithOrEmailStartingWith(
        firstPrefix: String,
        secondPrefix: String
    ): List<User>

    @Modifying
    @Query(
        """
        DELETE FROM User u
        WHERE u.email LIKE CONCAT(:firstPrefix, '%')
           OR u.email LIKE CONCAT(:secondPrefix, '%')
        """
    )
    fun deleteAllByEmailPrefixes(
        @Param("firstPrefix") firstPrefix: String,
        @Param("secondPrefix") secondPrefix: String
    ): Int

    @Query(
        value = """
        SELECT new com.gymflow.dto.AdminBookingMemberSummaryResponse(
            u.id,
            u.email,
            p.firstName,
            p.lastName,
            CASE
                WHEN LENGTH(TRIM(CONCAT(COALESCE(p.firstName, ''), ' ', COALESCE(p.lastName, '')))) > 0
                    THEN TRIM(CONCAT(COALESCE(p.firstName, ''), ' ', COALESCE(p.lastName, '')))
                ELSE u.email
            END,
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM UserMembership m
                    WHERE m.userId = u.id
                      AND m.status = 'ACTIVE'
                      AND m.endDate >= :today
                      AND m.deletedAt IS NULL
                ) THEN true
                ELSE false
            END
        )
        FROM User u
        LEFT JOIN UserProfile p
          ON p.userId = u.id
         AND p.deletedAt IS NULL
        WHERE u.deletedAt IS NULL
          AND u.role = 'USER'
          AND (
            LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(p.firstName, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(p.lastName, '')) LIKE LOWER(CONCAT('%', :query, '%'))
          )
        ORDER BY
          CASE WHEN p.lastName IS NULL THEN 1 ELSE 0 END ASC,
          LOWER(COALESCE(p.lastName, '')) ASC,
          CASE WHEN p.firstName IS NULL THEN 1 ELSE 0 END ASC,
          LOWER(COALESCE(p.firstName, '')) ASC,
          LOWER(u.email) ASC
        """,
        countQuery = """
        SELECT COUNT(u)
        FROM User u
        LEFT JOIN UserProfile p
          ON p.userId = u.id
         AND p.deletedAt IS NULL
        WHERE u.deletedAt IS NULL
          AND u.role = 'USER'
          AND (
            LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(p.firstName, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(COALESCE(p.lastName, '')) LIKE LOWER(CONCAT('%', :query, '%'))
          )
        """
    )
    fun searchBookingMembers(
        @Param("query") query: String,
        @Param("today") today: LocalDate,
        pageable: Pageable
    ): Page<AdminBookingMemberSummaryResponse>
}
