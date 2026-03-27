package com.gymflow.repository

import com.gymflow.domain.UserMembership
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface UserMembershipRepository : JpaRepository<UserMembership, UUID> {

    fun findByUserIdAndStatus(userId: UUID, status: String): UserMembership?

    fun existsByUserIdAndStatus(userId: UUID, status: String): Boolean

    fun findAllByStatus(status: String, pageable: Pageable): Page<UserMembership>

    fun findAllByUserId(userId: UUID, pageable: Pageable): Page<UserMembership>

    fun findAllByUserIdAndStatus(
        userId: UUID,
        status: String,
        pageable: Pageable
    ): Page<UserMembership>

    @Query("SELECT COUNT(m) FROM UserMembership m WHERE m.planId = :planId AND m.status = 'ACTIVE'")
    fun countActiveByPlanId(@Param("planId") planId: UUID): Long
}
