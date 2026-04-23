package com.gymflow.service

import com.gymflow.domain.MembershipPlan
import com.gymflow.domain.UserMembership
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.Optional
import java.util.UUID

class OnboardingServiceTest {

    private val userProfileRepository = mockk<com.gymflow.repository.UserProfileRepository>()
    private val userMembershipRepository = mockk<com.gymflow.repository.UserMembershipRepository>(relaxUnitFun = true)
    private val membershipPlanRepository = mockk<com.gymflow.repository.MembershipPlanRepository>()

    private val service = OnboardingService(
        userProfileRepository = userProfileRepository,
        userMembershipRepository = userMembershipRepository,
        membershipPlanRepository = membershipPlanRepository
    )

    // -----------------------------------------------------------------------
    // createPlanPending — SDD §3 / Decision 25 contract
    // -----------------------------------------------------------------------

    @Test
    fun `createPlanPending - persists membership row with status ACTIVE`() {
        val plan = buildPlan(durationDays = 30)
        val userId = UUID.randomUUID()
        val savedSlot = slot<UserMembership>()

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { userMembershipRepository.save(capture(savedSlot)) } answers { savedSlot.captured }

        service.createPlanPending(userId, plan.id)

        assertEquals("ACTIVE", savedSlot.captured.status)
        verify(exactly = 1) { userMembershipRepository.save(any()) }
    }

    @Test
    fun `createPlanPending - sets endDate to startDate plus plan durationDays`() {
        val plan = buildPlan(durationDays = 90)
        val userId = UUID.randomUUID()
        val savedSlot = slot<UserMembership>()

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { userMembershipRepository.save(capture(savedSlot)) } answers { savedSlot.captured }

        service.createPlanPending(userId, plan.id)

        val today = LocalDate.now()
        assertEquals(today, savedSlot.captured.startDate)
        assertEquals(today.plusDays(90), savedSlot.captured.endDate)
    }

    @Test
    fun `createPlanPending - response status is ACTIVE`() {
        val plan = buildPlan()
        val userId = UUID.randomUUID()

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { userMembershipRepository.save(any()) } answers { firstArg() }

        val response = service.createPlanPending(userId, plan.id)

        assertEquals("ACTIVE", response.status)
        assertEquals(plan.id, response.planId)
        assertEquals(plan.name, response.planName)
    }

    @Test
    fun `createPlanPending - re-entering with a different plan deletes the prior ACTIVE row first`() {
        val firstPlan = buildPlan(name = "Monthly Basic", durationDays = 30)
        val secondPlan = buildPlan(name = "Annual Pro", durationDays = 365)
        val userId = UUID.randomUUID()

        every { membershipPlanRepository.findById(firstPlan.id) } returns Optional.of(firstPlan)
        every { membershipPlanRepository.findById(secondPlan.id) } returns Optional.of(secondPlan)
        every { userMembershipRepository.save(any()) } answers { firstArg() }

        service.createPlanPending(userId, firstPlan.id)
        service.createPlanPending(userId, secondPlan.id)

        // Defensive pre-delete must run on each call against the now-ACTIVE status
        // (regression for the retargeted deleteByUserIdAndStatus from PLAN_PENDING -> ACTIVE).
        verify(exactly = 2) { userMembershipRepository.deleteByUserIdAndStatus(userId, "ACTIVE") }
        verify(exactly = 0) { userMembershipRepository.deleteByUserIdAndStatus(userId, "PLAN_PENDING") }
        verify(exactly = 2) { userMembershipRepository.save(any()) }
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private fun buildPlan(
        id: UUID = UUID.randomUUID(),
        name: String = "Monthly Basic",
        description: String = "Unlimited gym access, weekdays only.",
        priceInCents: Int = 2999,
        durationDays: Int = 30,
        maxBookingsPerMonth: Int = 10,
        status: String = "ACTIVE"
    ) = MembershipPlan(
        id = id,
        name = name,
        description = description,
        priceInCents = priceInCents,
        durationDays = durationDays,
        maxBookingsPerMonth = maxBookingsPerMonth,
        status = status,
        createdAt = OffsetDateTime.now(),
        updatedAt = OffsetDateTime.now()
    )
}
