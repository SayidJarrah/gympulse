package com.gymflow.service

import com.gymflow.domain.User
import com.gymflow.domain.UserProfile
import com.gymflow.dto.UpdateUserProfileRequest
import com.gymflow.repository.UserProfileRepository
import com.gymflow.repository.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.Optional
import java.util.UUID

class UserProfileServiceTest {

    private val userProfileRepository: UserProfileRepository = mockk()
    private val userRepository: UserRepository = mockk()
    private val service = UserProfileService(userProfileRepository, userRepository)

    @Test
    fun `getMyProfile returns synthesized response when profile row does not exist`() {
        val user = buildUser()

        every { userRepository.findById(user.id) } returns Optional.of(user)
        every { userProfileRepository.findById(user.id) } returns Optional.empty()

        val response = service.getMyProfile(user.id)

        assertEquals(user.id, response.userId)
        assertEquals(user.email, response.email)
        assertNull(response.firstName)
        assertNull(response.lastName)
        assertNull(response.phone)
        assertNull(response.dateOfBirth)
        assertEquals(emptyList<String>(), response.fitnessGoals)
        assertEquals(emptyList<String>(), response.preferredClassTypes)
        assertEquals(user.createdAt, response.createdAt)
        assertEquals(user.updatedAt, response.updatedAt)
    }

    @Test
    fun `updateMyProfile creates profile and normalizes fields`() {
        val user = buildUser()
        val request = UpdateUserProfileRequest(
            firstName = "  Alice  ",
            lastName = "  Brown ",
            phone = "+48 (123) 123-123",
            dateOfBirth = "1994-08-12",
            fitnessGoals = listOf(" Build strength ", "build strength", "Improve mobility"),
            preferredClassTypes = listOf(" Yoga ", "HIIT", "yoga")
        )
        val savedSlot = slot<UserProfile>()

        every { userRepository.findById(user.id) } returns Optional.of(user)
        every { userProfileRepository.findById(user.id) } returns Optional.empty()
        every { userProfileRepository.save(capture(savedSlot)) } answers { savedSlot.captured }

        val response = service.updateMyProfile(user.id, request)

        assertEquals("Alice", savedSlot.captured.firstName)
        assertEquals("Brown", savedSlot.captured.lastName)
        assertEquals("+48123123123", savedSlot.captured.phone)
        assertEquals(LocalDate.of(1994, 8, 12), savedSlot.captured.dateOfBirth)
        assertEquals(listOf("Build strength", "Improve mobility"), savedSlot.captured.fitnessGoals)
        assertEquals(listOf("Yoga", "HIIT"), savedSlot.captured.preferredClassTypes)
        assertEquals(user.email, response.email)
        assertEquals(listOf("Build strength", "Improve mobility"), response.fitnessGoals)
        assertEquals(listOf("Yoga", "HIIT"), response.preferredClassTypes)
    }

    @Test
    fun `updateMyProfile updates existing profile in place`() {
        val user = buildUser()
        val existingProfile = buildProfile(userId = user.id)

        every { userRepository.findById(user.id) } returns Optional.of(user)
        every { userProfileRepository.findById(user.id) } returns Optional.of(existingProfile)
        every { userProfileRepository.save(existingProfile) } answers { firstArg() }

        service.updateMyProfile(
            user.id,
            UpdateUserProfileRequest(
                firstName = "New",
                lastName = null,
                phone = "+48111222333",
                dateOfBirth = null,
                fitnessGoals = emptyList(),
                preferredClassTypes = listOf("Pilates")
            )
        )

        assertEquals("New", existingProfile.firstName)
        assertNull(existingProfile.lastName)
        assertEquals("+48111222333", existingProfile.phone)
        assertNull(existingProfile.dateOfBirth)
        assertEquals(emptyList<String>(), existingProfile.fitnessGoals)
        assertEquals(listOf("Pilates"), existingProfile.preferredClassTypes)
        verify(exactly = 1) { userProfileRepository.save(existingProfile) }
    }

    @Test
    fun `updateMyProfile rejects read only shadow fields`() {
        val user = buildUser()

        every { userRepository.findById(user.id) } returns Optional.of(user)

        assertThrows<ReadOnlyFieldException> {
            service.updateMyProfile(
                user.id,
                UpdateUserProfileRequest(email = "new@example.com")
            )
        }
    }

    @Test
    fun `updateMyProfile rejects invalid phone`() {
        val user = buildUser()

        every { userRepository.findById(user.id) } returns Optional.of(user)

        assertThrows<InvalidPhoneException> {
            service.updateMyProfile(
                user.id,
                UpdateUserProfileRequest(phone = "12345")
            )
        }
    }

    @Test
    fun `updateMyProfile rejects future date of birth`() {
        val user = buildUser()

        every { userRepository.findById(user.id) } returns Optional.of(user)

        assertThrows<InvalidDateOfBirthException> {
            service.updateMyProfile(
                user.id,
                UpdateUserProfileRequest(dateOfBirth = LocalDate.now().plusDays(1).toString())
            )
        }
    }

    @Test
    fun `updateMyProfile rejects too many fitness goals before deduplication`() {
        val user = buildUser()

        every { userRepository.findById(user.id) } returns Optional.of(user)

        assertThrows<InvalidFitnessGoalsException> {
            service.updateMyProfile(
                user.id,
                UpdateUserProfileRequest(
                    fitnessGoals = listOf("One", "Two", "Three", "Four", "Five", "One")
                )
            )
        }
    }

    private fun buildUser(
        id: UUID = UUID.randomUUID(),
        email: String = "alice@example.com",
        createdAt: OffsetDateTime = OffsetDateTime.parse("2026-03-29T09:00:00Z"),
        updatedAt: OffsetDateTime = OffsetDateTime.parse("2026-03-29T09:00:00Z")
    ) = User(
        id = id,
        email = email,
        passwordHash = "hash",
        role = "USER",
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    private fun buildProfile(
        userId: UUID = UUID.randomUUID(),
        createdAt: OffsetDateTime = OffsetDateTime.parse("2026-03-29T10:00:00Z"),
        updatedAt: OffsetDateTime = OffsetDateTime.parse("2026-03-29T12:30:00Z")
    ) = UserProfile(
        userId = userId,
        firstName = "Existing",
        lastName = "User",
        phone = "+48123123123",
        dateOfBirth = LocalDate.of(1990, 1, 1),
        fitnessGoals = mutableListOf("Endurance"),
        preferredClassTypes = mutableListOf("Yoga"),
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}
