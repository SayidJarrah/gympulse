package com.gymflow.service

import com.gymflow.domain.UserMembership
import com.gymflow.dto.OnboardingCompleteResponse
import com.gymflow.dto.OnboardingPlanPendingResponse
import com.gymflow.repository.MembershipPlanRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserProfileRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@Service
class OnboardingService(
    private val userProfileRepository: UserProfileRepository,
    private val userMembershipRepository: UserMembershipRepository,
    private val membershipPlanRepository: MembershipPlanRepository,
) {

    @Transactional
    fun createPlanPending(userId: UUID, planId: UUID): OnboardingPlanPendingResponse {
        val plan = membershipPlanRepository.findById(planId)
            .orElseThrow { PlanNotFoundException("Plan not found: $planId") }

        if (plan.status != "ACTIVE") throw PlanNotAvailableException("This plan is not available for purchase")

        userMembershipRepository.deleteByUserIdAndStatus(userId, "ACTIVE")

        val membership = UserMembership(
            userId = userId,
            planId = plan.id,
            status = "ACTIVE",
            startDate = LocalDate.now(),
            endDate = LocalDate.now().plusDays(plan.durationDays.toLong()),
            bookingsUsedThisMonth = 0,
        )
        val saved = userMembershipRepository.save(membership)

        return OnboardingPlanPendingResponse(
            membershipId = saved.id,
            planId = plan.id,
            planName = plan.name,
            status = "ACTIVE",
        )
    }

    @Transactional
    fun completeOnboarding(userId: UUID): OnboardingCompleteResponse {
        val profile = userProfileRepository.findById(userId)
            .orElseThrow { UserNotFoundException("User profile not found for user: $userId") }

        if (profile.onboardingCompletedAt != null) {
            return OnboardingCompleteResponse(profile.onboardingCompletedAt!!)
        }

        profile.onboardingCompletedAt = OffsetDateTime.now()
        profile.updatedAt = OffsetDateTime.now()
        userProfileRepository.save(profile)

        return OnboardingCompleteResponse(profile.onboardingCompletedAt!!)
    }
}
