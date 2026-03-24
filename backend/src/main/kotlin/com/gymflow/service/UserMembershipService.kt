package com.gymflow.service

import com.gymflow.dto.MembershipPurchaseRequest
import com.gymflow.dto.UserMembershipResponse
import com.gymflow.domain.UserMembership
import com.gymflow.repository.MembershipPlanRepository
import com.gymflow.repository.UserMembershipRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@Service
@Transactional
class UserMembershipService(
    private val userMembershipRepository: UserMembershipRepository,
    private val membershipPlanRepository: MembershipPlanRepository
) {

    fun purchaseMembership(userId: UUID, request: MembershipPurchaseRequest): UserMembershipResponse {
        val planId = request.planId!!

        val plan = membershipPlanRepository.findById(planId)
            .orElseThrow { PlanNotFoundException("Plan with id '$planId' not found") }

        if (plan.status == "INACTIVE") {
            throw PlanNotAvailableException("Plan with id '$planId' is not available for purchase")
        }

        if (userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE")) {
            throw MembershipAlreadyActiveException(
                "User already has an active membership. Cancel it before activating a new one."
            )
        }

        val startDate = LocalDate.now()
        val endDate = startDate.plusDays(plan.durationDays.toLong())

        val membership = UserMembership(
            userId = userId,
            planId = plan.id,
            status = "ACTIVE",
            startDate = startDate,
            endDate = endDate,
            bookingsUsedThisMonth = 0,
            createdAt = OffsetDateTime.now(),
            updatedAt = OffsetDateTime.now()
        )

        val saved = try {
            userMembershipRepository.save(membership)
        } catch (ex: DataIntegrityViolationException) {
            throw MembershipAlreadyActiveException(
                "User already has an active membership. Cancel it before activating a new one."
            )
        }

        return saved.toResponse(planName = plan.name, maxBookingsPerMonth = plan.maxBookingsPerMonth)
    }

    @Transactional(readOnly = true)
    fun getMyActiveMembership(userId: UUID): UserMembershipResponse {
        val membership = userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE")
            ?: throw NoActiveMembershipException("No active membership found for the current user")

        val plan = membershipPlanRepository.findById(membership.planId)
            .orElseThrow { PlanNotFoundException("Plan with id '${membership.planId}' not found") }

        return membership.toResponse(planName = plan.name, maxBookingsPerMonth = plan.maxBookingsPerMonth)
    }

    fun cancelMyMembership(userId: UUID): UserMembershipResponse {
        val membership = userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE")
            ?: throw NoActiveMembershipException("No active membership found for the current user")

        membership.status = "CANCELLED"
        val saved = userMembershipRepository.save(membership)

        val plan = membershipPlanRepository.findById(saved.planId)
            .orElseThrow { PlanNotFoundException("Plan with id '${saved.planId}' not found") }

        return saved.toResponse(planName = plan.name, maxBookingsPerMonth = plan.maxBookingsPerMonth)
    }

    @Transactional(readOnly = true)
    fun getAllMemberships(status: String?, userId: UUID?, pageable: Pageable): Page<UserMembershipResponse> {
        if (status != null && status != "ACTIVE" && status != "CANCELLED" && status != "EXPIRED") {
            throw InvalidMembershipStatusFilterException(
                "Invalid status filter '$status'. Use ACTIVE, CANCELLED, or EXPIRED."
            )
        }

        val page: Page<UserMembership> = when {
            status != null && userId != null ->
                userMembershipRepository.findAllByUserIdAndStatus(userId, status, pageable)
            status != null ->
                userMembershipRepository.findAllByStatus(status, pageable)
            userId != null ->
                userMembershipRepository.findAllByUserId(userId, pageable)
            else ->
                userMembershipRepository.findAll(pageable)
        }

        return page.map { membership ->
            val plan = membershipPlanRepository.findById(membership.planId)
                .orElseThrow { PlanNotFoundException("Plan with id '${membership.planId}' not found") }
            membership.toResponse(planName = plan.name, maxBookingsPerMonth = plan.maxBookingsPerMonth)
        }
    }

    fun adminCancelMembership(membershipId: UUID): UserMembershipResponse {
        val membership = userMembershipRepository.findById(membershipId)
            .orElseThrow { MembershipNotFoundException("Membership with id '$membershipId' not found") }

        if (membership.status != "ACTIVE") {
            throw MembershipNotActiveException(
                "Membership with id '$membershipId' is not active and cannot be cancelled"
            )
        }

        membership.status = "CANCELLED"
        val saved = userMembershipRepository.save(membership)

        val plan = membershipPlanRepository.findById(saved.planId)
            .orElseThrow { PlanNotFoundException("Plan with id '${saved.planId}' not found") }

        return saved.toResponse(planName = plan.name, maxBookingsPerMonth = plan.maxBookingsPerMonth)
    }

    // --- Private helpers ---

    private fun UserMembership.toResponse(planName: String, maxBookingsPerMonth: Int) =
        UserMembershipResponse(
            id = id,
            userId = userId,
            planId = planId,
            planName = planName,
            startDate = startDate,
            endDate = endDate,
            status = status,
            bookingsUsedThisMonth = bookingsUsedThisMonth,
            maxBookingsPerMonth = maxBookingsPerMonth,
            createdAt = createdAt
        )
}

// --- Custom exceptions ---

class MembershipAlreadyActiveException(message: String) : RuntimeException(message)
class NoActiveMembershipException(message: String) : RuntimeException(message)
class MembershipNotFoundException(message: String) : RuntimeException(message)
class MembershipNotActiveException(message: String) : RuntimeException(message)
class PlanNotAvailableException(message: String) : RuntimeException(message)
class InvalidMembershipStatusFilterException(message: String) : RuntimeException(message)
