package com.gymflow.repository

import com.gymflow.domain.UserMembership
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional
import jakarta.persistence.LockModeType
import java.time.LocalDate
import java.util.UUID

interface UserMembershipRepository : JpaRepository<UserMembership, UUID> {

    fun findByUserIdAndStatus(userId: UUID, status: String): UserMembership?

    fun existsByUserIdAndStatus(userId: UUID, status: String): Boolean

    fun findAllByStatus(status: String, pageable: Pageable): Page<UserMembership>

    fun findAllByUserId(userId: UUID, pageable: Pageable): Page<UserMembership>

    fun findAllByUserIdIn(userIds: Collection<UUID>, pageable: Pageable): Page<UserMembership>

    fun findAllByUserIdAndStatus(
        userId: UUID,
        status: String,
        pageable: Pageable
    ): Page<UserMembership>

    fun findAllByUserIdInAndStatus(
        userIds: Collection<UUID>,
        status: String,
        pageable: Pageable
    ): Page<UserMembership>

    @Modifying
    @Transactional
    @Query("DELETE FROM UserMembership um WHERE um.userId = :userId AND um.status = :status")
    fun deleteByUserIdAndStatus(@Param("userId") userId: UUID, @Param("status") status: String)

    @Modifying
    @Query("DELETE FROM UserMembership m WHERE m.userId IN :userIds")
    fun deleteAllByUserIds(@Param("userIds") userIds: Collection<UUID>): Int

    @Modifying
    @Query("DELETE FROM UserMembership m WHERE m.planId IN :planIds")
    fun deleteAllByPlanIds(@Param("planIds") planIds: Collection<UUID>): Int

    @Query("SELECT COUNT(m) FROM UserMembership m WHERE m.planId = :planId AND m.status = 'ACTIVE'")
    fun countActiveByPlanId(@Param("planId") planId: UUID): Long

    @Query(
        """
        SELECT m FROM UserMembership m
        WHERE m.userId = :userId
          AND m.status = 'ACTIVE'
          AND m.endDate >= :today
          AND m.deletedAt IS NULL
        """
    )
    fun findAccessibleActiveMembership(
        @Param("userId") userId: UUID,
        @Param("today") today: LocalDate
    ): UserMembership?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        """
        SELECT m FROM UserMembership m
        WHERE m.userId = :userId
          AND m.status = 'ACTIVE'
          AND m.endDate >= :today
          AND m.deletedAt IS NULL
        """
    )
    fun findAccessibleActiveMembershipForUpdate(
        @Param("userId") userId: UUID,
        @Param("today") today: LocalDate
    ): UserMembership?
}
