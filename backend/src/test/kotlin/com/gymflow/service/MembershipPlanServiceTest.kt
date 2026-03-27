package com.gymflow.service

import com.gymflow.domain.MembershipPlan
import com.gymflow.dto.MembershipPlanRequest
import com.gymflow.repository.MembershipPlanRepository
import com.gymflow.repository.UserMembershipRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import java.time.OffsetDateTime
import java.util.Optional
import java.util.UUID

class MembershipPlanServiceTest {

    private val membershipPlanRepository: MembershipPlanRepository = mockk()
    private val userMembershipRepository: UserMembershipRepository = mockk()
    private val service = MembershipPlanService(membershipPlanRepository, userMembershipRepository)

    // -----------------------------------------------------------------------
    // getActivePlans
    // -----------------------------------------------------------------------

    @Test
    fun `getActivePlans - happy path - returns page of active plan responses`() {
        val pageable = PageRequest.of(0, 20)
        val plan = buildPlan(status = "ACTIVE")
        val page = PageImpl(listOf(plan), pageable, 1)

        every { membershipPlanRepository.findAllByStatus("ACTIVE", pageable) } returns page

        val result = service.getActivePlans(pageable)

        assertEquals(1, result.totalElements)
        assertEquals("ACTIVE", result.content[0].status)
        assertEquals(plan.name, result.content[0].name)
    }

    @Test
    fun `getActivePlans - empty result - returns empty page`() {
        val pageable = PageRequest.of(0, 20)
        val emptyPage = PageImpl(emptyList<MembershipPlan>(), pageable, 0)

        every { membershipPlanRepository.findAllByStatus("ACTIVE", pageable) } returns emptyPage

        val result = service.getActivePlans(pageable)

        assertEquals(0, result.totalElements)
        assertEquals(0, result.content.size)
    }

    // -----------------------------------------------------------------------
    // getPlanById
    // -----------------------------------------------------------------------

    @Test
    fun `getPlanById - active plan - any caller - returns response`() {
        val plan = buildPlan(status = "ACTIVE")

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        val result = service.getPlanById(plan.id, isAdmin = false)

        assertEquals(plan.id, result.id)
        assertEquals("ACTIVE", result.status)
    }

    @Test
    fun `getPlanById - inactive plan - admin caller - returns response`() {
        val plan = buildPlan(status = "INACTIVE")

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        val result = service.getPlanById(plan.id, isAdmin = true)

        assertEquals(plan.id, result.id)
        assertEquals("INACTIVE", result.status)
    }

    @Test
    fun `getPlanById - inactive plan - non-admin caller - throws PlanNotFoundException`() {
        val plan = buildPlan(status = "INACTIVE")

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        assertThrows<PlanNotFoundException> {
            service.getPlanById(plan.id, isAdmin = false)
        }
    }

    @Test
    fun `getPlanById - plan not found - throws PlanNotFoundException`() {
        val id = UUID.randomUUID()

        every { membershipPlanRepository.findById(id) } returns Optional.empty()

        assertThrows<PlanNotFoundException> {
            service.getPlanById(id, isAdmin = false)
        }
    }

    @Test
    fun `getPlanById - plan not found - admin caller - throws PlanNotFoundException`() {
        val id = UUID.randomUUID()

        every { membershipPlanRepository.findById(id) } returns Optional.empty()

        assertThrows<PlanNotFoundException> {
            service.getPlanById(id, isAdmin = true)
        }
    }

    // -----------------------------------------------------------------------
    // createPlan
    // -----------------------------------------------------------------------

    @Test
    fun `createPlan - happy path - saves plan with ACTIVE status and returns response`() {
        val request = buildRequest()
        val savedSlot = slot<MembershipPlan>()

        every { membershipPlanRepository.save(capture(savedSlot)) } answers { savedSlot.captured }

        val result = service.createPlan(request)

        assertEquals("ACTIVE", result.status)
        assertEquals(request.name, result.name)
        assertEquals(request.description, result.description)
        assertEquals(request.priceInCents, result.priceInCents)
        assertEquals(request.durationDays, result.durationDays)
        assertNotNull(result.id)
        verify(exactly = 1) { membershipPlanRepository.save(any()) }
    }

    // -----------------------------------------------------------------------
    // updatePlan
    // -----------------------------------------------------------------------

    @Test
    fun `updatePlan - name and description change only - no active subscriber check needed`() {
        val plan = buildPlan(priceInCents = 2999)
        val request = buildRequest(name = "New Name", description = "New Desc", priceInCents = 2999)

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { membershipPlanRepository.save(plan) } returns plan

        val result = service.updatePlan(plan.id, request)

        assertEquals("New Name", result.name)
        assertEquals("New Desc", result.description)
        assertEquals(2999, result.priceInCents)
    }

    @Test
    fun `updatePlan - price change with no active subscribers - succeeds`() {
        val plan = buildPlan(priceInCents = 2999)
        val request = buildRequest(priceInCents = 3999)

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { userMembershipRepository.countActiveByPlanId(plan.id) } returns 0L
        every { membershipPlanRepository.save(plan) } returns plan

        val result = service.updatePlan(plan.id, request)

        assertEquals(3999, result.priceInCents)
    }

    @Test
    fun `updatePlan - price change with active subscribers - throws PlanHasActiveSubscribersException`() {
        val plan = buildPlan(priceInCents = 2999)
        val request = buildRequest(priceInCents = 3999)

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { userMembershipRepository.countActiveByPlanId(plan.id) } returns 3L

        assertThrows<PlanHasActiveSubscribersException> {
            service.updatePlan(plan.id, request)
        }
    }

    @Test
    fun `updatePlan - plan not found - throws PlanNotFoundException`() {
        val id = UUID.randomUUID()

        every { membershipPlanRepository.findById(id) } returns Optional.empty()

        assertThrows<PlanNotFoundException> {
            service.updatePlan(id, buildRequest())
        }
    }

    // -----------------------------------------------------------------------
    // deactivatePlan
    // -----------------------------------------------------------------------

    @Test
    fun `deactivatePlan - happy path - sets status to INACTIVE and returns response`() {
        val plan = buildPlan(status = "ACTIVE")

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { membershipPlanRepository.save(plan) } returns plan

        val result = service.deactivatePlan(plan.id)

        assertEquals("INACTIVE", result.status)
        verify(exactly = 1) { membershipPlanRepository.save(plan) }
    }

    @Test
    fun `deactivatePlan - plan not found - throws PlanNotFoundException`() {
        val id = UUID.randomUUID()

        every { membershipPlanRepository.findById(id) } returns Optional.empty()

        assertThrows<PlanNotFoundException> {
            service.deactivatePlan(id)
        }
    }

    @Test
    fun `deactivatePlan - plan already inactive - throws PlanAlreadyInactiveException`() {
        val plan = buildPlan(status = "INACTIVE")

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        assertThrows<PlanAlreadyInactiveException> {
            service.deactivatePlan(plan.id)
        }
    }

    // -----------------------------------------------------------------------
    // activatePlan
    // -----------------------------------------------------------------------

    @Test
    fun `activatePlan - happy path - sets status to ACTIVE and returns response`() {
        val plan = buildPlan(status = "INACTIVE")

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { membershipPlanRepository.save(plan) } returns plan

        val result = service.activatePlan(plan.id)

        assertEquals("ACTIVE", result.status)
        verify(exactly = 1) { membershipPlanRepository.save(plan) }
    }

    @Test
    fun `activatePlan - plan not found - throws PlanNotFoundException`() {
        val id = UUID.randomUUID()

        every { membershipPlanRepository.findById(id) } returns Optional.empty()

        assertThrows<PlanNotFoundException> {
            service.activatePlan(id)
        }
    }

    @Test
    fun `activatePlan - plan already active - throws PlanAlreadyActiveException`() {
        val plan = buildPlan(status = "ACTIVE")

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        assertThrows<PlanAlreadyActiveException> {
            service.activatePlan(plan.id)
        }
    }

    // -----------------------------------------------------------------------
    // getAllPlans (admin list)
    // -----------------------------------------------------------------------

    @Test
    fun `getAllPlans - no status filter - returns all plans`() {
        val pageable = PageRequest.of(0, 20)
        val plans = listOf(buildPlan(status = "ACTIVE"), buildPlan(status = "INACTIVE"))
        val page = PageImpl(plans, pageable, 2)

        every { membershipPlanRepository.findAll(pageable) } returns page

        val result = service.getAllPlans(null, pageable)

        assertEquals(2, result.totalElements)
    }

    @Test
    fun `getAllPlans - filter by ACTIVE - returns only active plans`() {
        val pageable = PageRequest.of(0, 20)
        val plans = listOf(buildPlan(status = "ACTIVE"))
        val page = PageImpl(plans, pageable, 1)

        every { membershipPlanRepository.findAllByStatus("ACTIVE", pageable) } returns page

        val result = service.getAllPlans("ACTIVE", pageable)

        assertEquals(1, result.totalElements)
        assertEquals("ACTIVE", result.content[0].status)
    }

    @Test
    fun `getAllPlans - filter by INACTIVE - returns only inactive plans`() {
        val pageable = PageRequest.of(0, 20)
        val plans = listOf(buildPlan(status = "INACTIVE"))
        val page = PageImpl(plans, pageable, 1)

        every { membershipPlanRepository.findAllByStatus("INACTIVE", pageable) } returns page

        val result = service.getAllPlans("INACTIVE", pageable)

        assertEquals(1, result.totalElements)
        assertEquals("INACTIVE", result.content[0].status)
    }

    @Test
    fun `getAllPlans - invalid status filter - throws InvalidStatusFilterException`() {
        assertThrows<InvalidStatusFilterException> {
            service.getAllPlans("PENDING", PageRequest.of(0, 20))
        }
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

    private fun buildRequest(
        name: String = "Annual Premium",
        description: String = "Full access including classes.",
        priceInCents: Int = 89900,
        durationDays: Int = 365
    ) = MembershipPlanRequest(
        name = name,
        description = description,
        priceInCents = priceInCents,
        durationDays = durationDays
    )
}
