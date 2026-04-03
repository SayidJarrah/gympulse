package com.gymflow.service

import com.gymflow.dto.MembershipPurchaseRequest
import com.gymflow.dto.UserMembershipResponse
import com.gymflow.domain.UserMembership
import com.gymflow.repository.MembershipPlanRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserProfileRepository
import com.gymflow.repository.UserRepository
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
    private val membershipPlanRepository: MembershipPlanRepository,
    private val userRepository: UserRepository,
    private val userProfileRepository: UserProfileRepository
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

        val user = userRepository.findById(userId).orElse(null)
        val profile = userProfileRepository.findById(userId).orElse(null)
        return saved.toResponse(
            planName = plan.name,
            maxBookingsPerMonth = plan.maxBookingsPerMonth,
            userEmail = user?.email,
            userFirstName = profile?.firstName,
            userLastName = profile?.lastName,
            userPhone = profile?.phone,
            userDateOfBirth = profile?.dateOfBirth,
            userFitnessGoals = profile?.fitnessGoals ?: emptyList(),
            userPreferredClassTypes = profile?.preferredClassTypes ?: emptyList()
        )
    }

    @Transactional(readOnly = true)
    fun getMyActiveMembership(userId: UUID): UserMembershipResponse {
        val membership = userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE")
            ?: throw NoActiveMembershipException("No active membership found for the current user")

        val plan = membershipPlanRepository.findById(membership.planId)
            .orElseThrow { PlanNotFoundException("Plan with id '${membership.planId}' not found") }

        val user = userRepository.findById(userId).orElse(null)
        val profile = userProfileRepository.findById(userId).orElse(null)
        return membership.toResponse(
            planName = plan.name,
            maxBookingsPerMonth = plan.maxBookingsPerMonth,
            userEmail = user?.email,
            userFirstName = profile?.firstName,
            userLastName = profile?.lastName,
            userPhone = profile?.phone,
            userDateOfBirth = profile?.dateOfBirth,
            userFitnessGoals = profile?.fitnessGoals ?: emptyList(),
            userPreferredClassTypes = profile?.preferredClassTypes ?: emptyList()
        )
    }

    fun cancelMyMembership(userId: UUID): UserMembershipResponse {
        val membership = userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE")
            ?: throw NoActiveMembershipException("No active membership found for the current user")

        membership.status = "CANCELLED"
        val saved = userMembershipRepository.save(membership)

        val plan = membershipPlanRepository.findById(saved.planId)
            .orElseThrow { PlanNotFoundException("Plan with id '${saved.planId}' not found") }

        val user = userRepository.findById(userId).orElse(null)
        val profile = userProfileRepository.findById(userId).orElse(null)
        return saved.toResponse(
            planName = plan.name,
            maxBookingsPerMonth = plan.maxBookingsPerMonth,
            userEmail = user?.email,
            userFirstName = profile?.firstName,
            userLastName = profile?.lastName,
            userPhone = profile?.phone,
            userDateOfBirth = profile?.dateOfBirth,
            userFitnessGoals = profile?.fitnessGoals ?: emptyList(),
            userPreferredClassTypes = profile?.preferredClassTypes ?: emptyList()
        )
    }

    @Transactional(readOnly = true)
    fun getAllMemberships(
        status: String?,
        userId: UUID?,
        memberQuery: String?,
        pageable: Pageable
    ): Page<UserMembershipResponse> {
        if (status != null && status != "ACTIVE" && status != "CANCELLED" && status != "EXPIRED") {
            throw InvalidMembershipStatusFilterException(
                "Invalid status filter '$status'. Use ACTIVE, CANCELLED, or EXPIRED."
            )
        }

        val normalizedMemberQuery = memberQuery?.trim()?.takeIf { it.isNotEmpty() }
        val filteredUserIds = when {
            normalizedMemberQuery == null -> null
            else -> {
                val matchedUserIds = userProfileRepository.findUserIdsByNameContainingIgnoreCase(normalizedMemberQuery)
                when {
                    matchedUserIds.isEmpty() -> return Page.empty(pageable)
                    userId != null && userId !in matchedUserIds -> return Page.empty(pageable)
                    userId != null -> listOf(userId)
                    else -> matchedUserIds
                }
            }
        }

        val page: Page<UserMembership> = when {
            filteredUserIds != null && status != null ->
                userMembershipRepository.findAllByUserIdInAndStatus(filteredUserIds, status, pageable)
            filteredUserIds != null ->
                userMembershipRepository.findAllByUserIdIn(filteredUserIds, pageable)
            status != null && userId != null ->
                userMembershipRepository.findAllByUserIdAndStatus(userId, status, pageable)
            status != null ->
                userMembershipRepository.findAllByStatus(status, pageable)
            userId != null ->
                userMembershipRepository.findAllByUserId(userId, pageable)
            else ->
                userMembershipRepository.findAll(pageable)
        }

        val userIds = page.content.map { it.userId }.toSet()
        val usersById = userRepository.findAllById(userIds).associateBy { it.id }
        val profilesById = userProfileRepository.findAllById(userIds).associateBy { it.userId }

        return page.map { membership ->
            val plan = membershipPlanRepository.findById(membership.planId)
                .orElseThrow { PlanNotFoundException("Plan with id '${membership.planId}' not found") }
            val user = usersById[membership.userId]
            val profile = profilesById[membership.userId]
            membership.toResponse(
                planName = plan.name,
                maxBookingsPerMonth = plan.maxBookingsPerMonth,
                userEmail = user?.email,
                userFirstName = profile?.firstName,
                userLastName = profile?.lastName,
                userPhone = profile?.phone,
                userDateOfBirth = profile?.dateOfBirth,
                userFitnessGoals = profile?.fitnessGoals ?: emptyList(),
                userPreferredClassTypes = profile?.preferredClassTypes ?: emptyList()
            )
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

        val user = userRepository.findById(saved.userId).orElse(null)
        val profile = userProfileRepository.findById(saved.userId).orElse(null)
        return saved.toResponse(
            planName = plan.name,
            maxBookingsPerMonth = plan.maxBookingsPerMonth,
            userEmail = user?.email,
            userFirstName = profile?.firstName,
            userLastName = profile?.lastName,
            userPhone = profile?.phone,
            userDateOfBirth = profile?.dateOfBirth,
            userFitnessGoals = profile?.fitnessGoals ?: emptyList(),
            userPreferredClassTypes = profile?.preferredClassTypes ?: emptyList()
        )
    }

    // --- Private helpers ---

    private fun UserMembership.toResponse(
        planName: String,
        maxBookingsPerMonth: Int,
        userEmail: String?,
        userFirstName: String?,
        userLastName: String?,
        userPhone: String?,
        userDateOfBirth: LocalDate?,
        userFitnessGoals: List<String>,
        userPreferredClassTypes: List<String>
    ) =
        UserMembershipResponse(
            id = id,
            userId = userId,
            userEmail = userEmail,
            userFirstName = userFirstName,
            userLastName = userLastName,
            userPhone = userPhone,
            userDateOfBirth = userDateOfBirth,
            userFitnessGoals = userFitnessGoals,
            userPreferredClassTypes = userPreferredClassTypes,
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
