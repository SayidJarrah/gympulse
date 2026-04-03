package com.gymflow.service

import com.gymflow.domain.MembershipPlan
import com.gymflow.domain.UserMembership
import com.gymflow.dto.MembershipPurchaseRequest
import com.gymflow.repository.MembershipPlanRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserProfileRepository
import com.gymflow.repository.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.Optional
import java.util.UUID

class UserMembershipServiceTest {

    private val userMembershipRepository: UserMembershipRepository = mockk()
    private val membershipPlanRepository: MembershipPlanRepository = mockk()
    private val userRepository: UserRepository = mockk()
    private val userProfileRepository: UserProfileRepository = mockk()
    private val service = UserMembershipService(
        userMembershipRepository = userMembershipRepository,
        membershipPlanRepository = membershipPlanRepository,
        userRepository = userRepository,
        userProfileRepository = userProfileRepository
    )

    @BeforeEach
    fun setUp() {
        every { userRepository.findById(any()) } returns Optional.empty()
        every { userProfileRepository.findById(any()) } returns Optional.empty()
        every { userRepository.findAllById(any<Iterable<UUID>>()) } returns emptyList()
        every { userProfileRepository.findAllById(any<Iterable<UUID>>()) } returns emptyList()
    }

    // -----------------------------------------------------------------------
    // purchaseMembership — happy path
    // -----------------------------------------------------------------------

    @Test
    fun `purchaseMembership - happy path - creates ACTIVE membership with correct dates`() {
        val plan = buildPlan(durationDays = 30)
        val userId = UUID.randomUUID()
        val request = MembershipPurchaseRequest(planId = plan.id)
        val savedSlot = slot<UserMembership>()

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns false
        every { userMembershipRepository.save(capture(savedSlot)) } answers { savedSlot.captured }

        val result = service.purchaseMembership(userId, request)

        val today = LocalDate.now()
        assertEquals("ACTIVE", result.status)
        assertEquals(userId, result.userId)
        assertEquals(plan.id, result.planId)
        assertEquals(plan.name, result.planName)
        assertEquals(today, result.startDate)
        assertEquals(today.plusDays(30), result.endDate)
        assertEquals(0, result.bookingsUsedThisMonth)
        assertEquals(plan.maxBookingsPerMonth, result.maxBookingsPerMonth)
        verify(exactly = 1) { userMembershipRepository.save(any()) }
    }

    @Test
    fun `purchaseMembership - bookingsUsedThisMonth is zero on new purchase`() {
        val plan = buildPlan()
        val userId = UUID.randomUUID()
        val request = MembershipPurchaseRequest(planId = plan.id)
        val savedSlot = slot<UserMembership>()

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns false
        every { userMembershipRepository.save(capture(savedSlot)) } answers { savedSlot.captured }

        val result = service.purchaseMembership(userId, request)

        assertEquals(0, result.bookingsUsedThisMonth)
        assertEquals(0, savedSlot.captured.bookingsUsedThisMonth)
    }

    // -----------------------------------------------------------------------
    // purchaseMembership — error cases
    // -----------------------------------------------------------------------

    @Test
    fun `purchaseMembership - plan not found - throws PlanNotFoundException`() {
        val planId = UUID.randomUUID()
        val userId = UUID.randomUUID()
        val request = MembershipPurchaseRequest(planId = planId)

        every { membershipPlanRepository.findById(planId) } returns Optional.empty()

        assertThrows<PlanNotFoundException> {
            service.purchaseMembership(userId, request)
        }
    }

    @Test
    fun `purchaseMembership - plan inactive - throws PlanNotAvailableException`() {
        val plan = buildPlan(status = "INACTIVE")
        val userId = UUID.randomUUID()
        val request = MembershipPurchaseRequest(planId = plan.id)

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        assertThrows<PlanNotAvailableException> {
            service.purchaseMembership(userId, request)
        }
    }

    @Test
    fun `purchaseMembership - user already has ACTIVE membership - throws MembershipAlreadyActiveException`() {
        val plan = buildPlan()
        val userId = UUID.randomUUID()
        val request = MembershipPurchaseRequest(planId = plan.id)

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns true

        assertThrows<MembershipAlreadyActiveException> {
            service.purchaseMembership(userId, request)
        }
    }

    @Test
    fun `purchaseMembership - DataIntegrityViolationException on save - throws MembershipAlreadyActiveException`() {
        val plan = buildPlan()
        val userId = UUID.randomUUID()
        val request = MembershipPurchaseRequest(planId = plan.id)

        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)
        every { userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE") } returns false
        every { userMembershipRepository.save(any()) } throws DataIntegrityViolationException("unique constraint violation")

        assertThrows<MembershipAlreadyActiveException> {
            service.purchaseMembership(userId, request)
        }
    }

    // -----------------------------------------------------------------------
    // getMyActiveMembership — happy path
    // -----------------------------------------------------------------------

    @Test
    fun `getMyActiveMembership - happy path - returns ACTIVE membership`() {
        val plan = buildPlan()
        val userId = UUID.randomUUID()
        val membership = buildMembership(userId = userId, planId = plan.id, status = "ACTIVE")

        every { userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE") } returns membership
        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        val result = service.getMyActiveMembership(userId)

        assertEquals("ACTIVE", result.status)
        assertEquals(membership.id, result.id)
        assertEquals(plan.name, result.planName)
        assertEquals(plan.maxBookingsPerMonth, result.maxBookingsPerMonth)
    }

    // -----------------------------------------------------------------------
    // getMyActiveMembership — error cases
    // -----------------------------------------------------------------------

    @Test
    fun `getMyActiveMembership - no active membership - throws NoActiveMembershipException`() {
        val userId = UUID.randomUUID()

        every { userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE") } returns null

        assertThrows<NoActiveMembershipException> {
            service.getMyActiveMembership(userId)
        }
    }

    // -----------------------------------------------------------------------
    // cancelMyMembership — happy path
    // -----------------------------------------------------------------------

    @Test
    fun `cancelMyMembership - happy path - sets status to CANCELLED and returns response`() {
        val plan = buildPlan()
        val userId = UUID.randomUUID()
        val membership = buildMembership(userId = userId, planId = plan.id, status = "ACTIVE")

        every { userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE") } returns membership
        every { userMembershipRepository.save(membership) } answers { firstArg() }
        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        val result = service.cancelMyMembership(userId)

        assertEquals("CANCELLED", result.status)
        verify(exactly = 1) { userMembershipRepository.save(membership) }
    }

    // -----------------------------------------------------------------------
    // cancelMyMembership — error cases
    // -----------------------------------------------------------------------

    @Test
    fun `cancelMyMembership - no active membership - throws NoActiveMembershipException`() {
        val userId = UUID.randomUUID()

        every { userMembershipRepository.findByUserIdAndStatus(userId, "ACTIVE") } returns null

        assertThrows<NoActiveMembershipException> {
            service.cancelMyMembership(userId)
        }
    }

    // -----------------------------------------------------------------------
    // getAllMemberships — happy paths
    // -----------------------------------------------------------------------

    @Test
    fun `getAllMemberships - no filter - returns all memberships`() {
        val pageable = PageRequest.of(0, 20)
        val plan = buildPlan()
        val memberships = listOf(
            buildMembership(planId = plan.id, status = "ACTIVE"),
            buildMembership(planId = plan.id, status = "CANCELLED")
        )
        val page = PageImpl(memberships, pageable, 2)

        every { userMembershipRepository.findAll(pageable) } returns page
        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        val result = service.getAllMemberships(null, null, null, pageable)

        assertEquals(2, result.totalElements)
    }

    @Test
    fun `getAllMemberships - filter by status ACTIVE - returns only active memberships`() {
        val pageable = PageRequest.of(0, 20)
        val plan = buildPlan()
        val membership = buildMembership(planId = plan.id, status = "ACTIVE")
        val page = PageImpl(listOf(membership), pageable, 1)

        every { userMembershipRepository.findAllByStatus("ACTIVE", pageable) } returns page
        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        val result = service.getAllMemberships("ACTIVE", null, null, pageable)

        assertEquals(1, result.totalElements)
        assertEquals("ACTIVE", result.content[0].status)
    }

    @Test
    fun `getAllMemberships - filter by userId - returns only that user's memberships`() {
        val pageable = PageRequest.of(0, 20)
        val plan = buildPlan()
        val userId = UUID.randomUUID()
        val membership = buildMembership(userId = userId, planId = plan.id)
        val page = PageImpl(listOf(membership), pageable, 1)

        every { userMembershipRepository.findAllByUserId(userId, pageable) } returns page
        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        val result = service.getAllMemberships(null, userId, null, pageable)

        assertEquals(1, result.totalElements)
        assertEquals(userId, result.content[0].userId)
    }

    @Test
    fun `getAllMemberships - filter by both status and userId - returns filtered memberships`() {
        val pageable = PageRequest.of(0, 20)
        val plan = buildPlan()
        val userId = UUID.randomUUID()
        val membership = buildMembership(userId = userId, planId = plan.id, status = "CANCELLED")
        val page = PageImpl(listOf(membership), pageable, 1)

        every { userMembershipRepository.findAllByUserIdAndStatus(userId, "CANCELLED", pageable) } returns page
        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        val result = service.getAllMemberships("CANCELLED", userId, null, pageable)

        assertEquals(1, result.totalElements)
        assertEquals("CANCELLED", result.content[0].status)
        assertEquals(userId, result.content[0].userId)
    }

    @Test
    fun `getAllMemberships - filter by memberQuery - returns memberships for matching users`() {
        val pageable = PageRequest.of(0, 20)
        val plan = buildPlan()
        val matchingUserId = UUID.randomUUID()
        val membership = buildMembership(userId = matchingUserId, planId = plan.id)
        val page = PageImpl(listOf(membership), pageable, 1)

        every { userProfileRepository.findUserIdsByNameContainingIgnoreCase("john") } returns listOf(matchingUserId)
        every { userMembershipRepository.findAllByUserIdIn(listOf(matchingUserId), pageable) } returns page
        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        val result = service.getAllMemberships(null, null, "john", pageable)

        assertEquals(1, result.totalElements)
        assertEquals(matchingUserId, result.content[0].userId)
    }

    @Test
    fun `getAllMemberships - memberQuery with userId - intersects filters`() {
        val pageable = PageRequest.of(0, 20)
        val plan = buildPlan()
        val userId = UUID.randomUUID()
        val membership = buildMembership(userId = userId, planId = plan.id, status = "ACTIVE")
        val page = PageImpl(listOf(membership), pageable, 1)

        every { userProfileRepository.findUserIdsByNameContainingIgnoreCase("ann") } returns listOf(userId, UUID.randomUUID())
        every { userMembershipRepository.findAllByUserIdInAndStatus(listOf(userId), "ACTIVE", pageable) } returns page
        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        val result = service.getAllMemberships("ACTIVE", userId, "ann", pageable)

        assertEquals(1, result.totalElements)
        assertEquals(userId, result.content[0].userId)
        assertEquals("ACTIVE", result.content[0].status)
    }

    @Test
    fun `getAllMemberships - memberQuery with no matching profiles - returns empty page`() {
        val pageable = PageRequest.of(0, 20)

        every { userProfileRepository.findUserIdsByNameContainingIgnoreCase("missing") } returns emptyList()

        val result = service.getAllMemberships(null, null, "missing", pageable)

        assertEquals(0, result.totalElements)
        assertEquals(0, result.content.size)
        verify(exactly = 0) { userMembershipRepository.findAllByUserIdIn(any<Collection<UUID>>(), pageable) }
    }

    // -----------------------------------------------------------------------
    // getAllMemberships — error cases
    // -----------------------------------------------------------------------

    @Test
    fun `getAllMemberships - invalid status filter - throws InvalidMembershipStatusFilterException`() {
        val pageable = PageRequest.of(0, 20)

        assertThrows<InvalidMembershipStatusFilterException> {
            service.getAllMemberships("PENDING", null, null, pageable)
        }
    }

    // -----------------------------------------------------------------------
    // adminCancelMembership — happy path
    // -----------------------------------------------------------------------

    @Test
    fun `adminCancelMembership - happy path - sets status to CANCELLED`() {
        val plan = buildPlan()
        val membership = buildMembership(planId = plan.id, status = "ACTIVE")

        every { userMembershipRepository.findById(membership.id) } returns Optional.of(membership)
        every { userMembershipRepository.save(membership) } answers { firstArg() }
        every { membershipPlanRepository.findById(plan.id) } returns Optional.of(plan)

        val result = service.adminCancelMembership(membership.id)

        assertEquals("CANCELLED", result.status)
        assertEquals(membership.id, result.id)
        verify(exactly = 1) { userMembershipRepository.save(membership) }
    }

    // -----------------------------------------------------------------------
    // adminCancelMembership — error cases
    // -----------------------------------------------------------------------

    @Test
    fun `adminCancelMembership - membership not found - throws MembershipNotFoundException`() {
        val membershipId = UUID.randomUUID()

        every { userMembershipRepository.findById(membershipId) } returns Optional.empty()

        assertThrows<MembershipNotFoundException> {
            service.adminCancelMembership(membershipId)
        }
    }

    @Test
    fun `adminCancelMembership - membership already CANCELLED - throws MembershipNotActiveException`() {
        val plan = buildPlan()
        val membership = buildMembership(planId = plan.id, status = "CANCELLED")

        every { userMembershipRepository.findById(membership.id) } returns Optional.of(membership)

        assertThrows<MembershipNotActiveException> {
            service.adminCancelMembership(membership.id)
        }
    }

    @Test
    fun `adminCancelMembership - membership already EXPIRED - throws MembershipNotActiveException`() {
        val plan = buildPlan()
        val membership = buildMembership(planId = plan.id, status = "EXPIRED")

        every { userMembershipRepository.findById(membership.id) } returns Optional.of(membership)

        assertThrows<MembershipNotActiveException> {
            service.adminCancelMembership(membership.id)
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

    private fun buildMembership(
        id: UUID = UUID.randomUUID(),
        userId: UUID = UUID.randomUUID(),
        planId: UUID = UUID.randomUUID(),
        status: String = "ACTIVE",
        startDate: LocalDate = LocalDate.now(),
        endDate: LocalDate = LocalDate.now().plusDays(30),
        bookingsUsedThisMonth: Int = 0
    ) = UserMembership(
        id = id,
        userId = userId,
        planId = planId,
        status = status,
        startDate = startDate,
        endDate = endDate,
        bookingsUsedThisMonth = bookingsUsedThisMonth,
        createdAt = OffsetDateTime.now(),
        updatedAt = OffsetDateTime.now()
    )
}
