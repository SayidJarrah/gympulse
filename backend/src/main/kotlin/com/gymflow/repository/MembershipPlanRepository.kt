package com.gymflow.repository

import com.gymflow.domain.MembershipPlan
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface MembershipPlanRepository : JpaRepository<MembershipPlan, UUID> {
    fun findAllByStatus(status: String, pageable: Pageable): Page<MembershipPlan>

    fun findAllByNameStartingWith(prefix: String): List<MembershipPlan>

    @Modifying
    @Query("DELETE FROM MembershipPlan p WHERE p.name LIKE CONCAT(:prefix, '%')")
    fun deleteAllByNameStartingWith(@Param("prefix") prefix: String): Int
}
