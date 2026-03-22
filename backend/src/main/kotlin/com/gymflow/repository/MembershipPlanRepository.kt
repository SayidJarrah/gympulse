package com.gymflow.repository

import com.gymflow.domain.MembershipPlan
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface MembershipPlanRepository : JpaRepository<MembershipPlan, UUID> {
    fun findAllByStatus(status: String, pageable: Pageable): Page<MembershipPlan>
}
