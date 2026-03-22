package com.gymflow.service

import com.gymflow.domain.MembershipPlan
import com.gymflow.dto.MembershipPlanRequest
import com.gymflow.dto.MembershipPlanResponse
import com.gymflow.repository.MembershipPlanRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional
class MembershipPlanService(
    private val membershipPlanRepository: MembershipPlanRepository
) {

    @Transactional(readOnly = true)
    fun getActivePlans(pageable: Pageable): Page<MembershipPlanResponse> {
        return membershipPlanRepository.findAllByStatus("ACTIVE", pageable)
            .map { it.toResponse() }
    }

    @Transactional(readOnly = true)
    fun getPlanById(id: UUID, isAdmin: Boolean): MembershipPlanResponse {
        val plan = membershipPlanRepository.findById(id)
            .orElseThrow { PlanNotFoundException("Plan with id '$id' not found") }

        if (!isAdmin && plan.status == "INACTIVE") {
            throw PlanNotFoundException("Plan with id '$id' not found")
        }

        return plan.toResponse()
    }

    fun createPlan(request: MembershipPlanRequest): MembershipPlanResponse {
        val plan = MembershipPlan(
            name = request.name!!,
            description = request.description!!,
            priceInCents = request.priceInCents!!,
            durationDays = request.durationDays!!,
            status = "ACTIVE"
        )
        return membershipPlanRepository.save(plan).toResponse()
    }

    fun updatePlan(id: UUID, request: MembershipPlanRequest): MembershipPlanResponse {
        val plan = membershipPlanRepository.findById(id)
            .orElseThrow { PlanNotFoundException("Plan with id '$id' not found") }

        val newPrice = request.priceInCents!!
        if (newPrice != plan.priceInCents) {
            // TODO: replace stub with real UserMembershipRepository.countActiveByPlanId(id)
            // once the "User membership purchase" feature is implemented.
            val activeSubscriberCount = countActiveSubscribers(id)
            if (activeSubscriberCount > 0) {
                throw PlanHasActiveSubscribersException(
                    "Cannot change the price while members are subscribed to this plan"
                )
            }
        }

        plan.name = request.name!!
        plan.description = request.description!!
        plan.priceInCents = newPrice
        plan.durationDays = request.durationDays!!

        return membershipPlanRepository.save(plan).toResponse()
    }

    fun deactivatePlan(id: UUID): MembershipPlanResponse {
        val plan = membershipPlanRepository.findById(id)
            .orElseThrow { PlanNotFoundException("Plan with id '$id' not found") }

        if (plan.status == "INACTIVE") {
            throw PlanAlreadyInactiveException("Plan with id '$id' is already inactive")
        }

        plan.status = "INACTIVE"
        return membershipPlanRepository.save(plan).toResponse()
    }

    fun activatePlan(id: UUID): MembershipPlanResponse {
        val plan = membershipPlanRepository.findById(id)
            .orElseThrow { PlanNotFoundException("Plan with id '$id' not found") }

        if (plan.status == "ACTIVE") {
            throw PlanAlreadyActiveException("Plan with id '$id' is already active")
        }

        plan.status = "ACTIVE"
        return membershipPlanRepository.save(plan).toResponse()
    }

    @Transactional(readOnly = true)
    fun getAllPlans(status: String?, pageable: Pageable): Page<MembershipPlanResponse> {
        if (status != null && status != "ACTIVE" && status != "INACTIVE") {
            throw InvalidStatusFilterException("Invalid status filter '$status'. Use ACTIVE or INACTIVE.")
        }

        return if (status != null) {
            membershipPlanRepository.findAllByStatus(status, pageable).map { it.toResponse() }
        } else {
            membershipPlanRepository.findAll(pageable).map { it.toResponse() }
        }
    }

    // --- Private helpers ---

    /**
     * Stub that returns 0 until the "User membership purchase" feature creates
     * the user_memberships table and its repository.
     * TODO: replace with UserMembershipRepository.countActiveByPlanId(id) once available.
     */
    @Suppress("UNUSED_PARAMETER")
    private fun countActiveSubscribers(planId: UUID): Long = 0L

    private fun MembershipPlan.toResponse() = MembershipPlanResponse(
        id = id,
        name = name,
        description = description,
        priceInCents = priceInCents,
        durationDays = durationDays,
        status = status,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}

// --- Custom exceptions ---

class PlanNotFoundException(message: String) : RuntimeException(message)
class PlanAlreadyInactiveException(message: String) : RuntimeException(message)
class PlanAlreadyActiveException(message: String) : RuntimeException(message)
class PlanHasActiveSubscribersException(message: String) : RuntimeException(message)
class InvalidStatusFilterException(message: String) : RuntimeException(message)
