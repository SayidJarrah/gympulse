package com.gymflow.service

import com.gymflow.domain.RefreshToken
import com.gymflow.domain.User
import com.gymflow.dto.LoginResponse
import com.gymflow.repository.RefreshTokenRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import java.time.OffsetDateTime
import java.util.Optional
import java.util.UUID

class AuthServiceTest {

    private val userRepository: UserRepository = mockk()
    private val refreshTokenRepository: RefreshTokenRepository = mockk()
    private val userMembershipRepository: UserMembershipRepository = mockk()
    private val passwordEncoder: BCryptPasswordEncoder = BCryptPasswordEncoder(10)
    private val jwtService: JwtService = mockk()

    private val authService = AuthService(
        userRepository = userRepository,
        refreshTokenRepository = refreshTokenRepository,
        userMembershipRepository = userMembershipRepository,
        passwordEncoder = passwordEncoder,
        jwtService = jwtService,
        refreshTokenExpiryDays = 30
    )

    // -----------------------------------------------------------------------
    // register
    // -----------------------------------------------------------------------

    @Test
    fun `register - happy path - returns RegisterResponse with USER role`() {
        val email = "alice@example.com"
        val password = "secret99"
        val userSlot = slot<User>()

        every { userRepository.findByEmailAndDeletedAtIsNull(email) } returns null
        every { userRepository.save(capture(userSlot)) } answers { userSlot.captured }

        val response = authService.register(email, password)

        assertEquals(email, response.email)
        assertEquals("USER", response.role)
        assertNotNull(response.id)
        assertNotNull(response.createdAt)
        // role is always USER regardless of what was passed
        verify(exactly = 1) { userRepository.save(any()) }
    }

    @Test
    fun `register - duplicate email - throws EmailAlreadyExistsException`() {
        val email = "alice@example.com"
        val existingUser = buildUser(email = email)

        every { userRepository.findByEmailAndDeletedAtIsNull(email) } returns existingUser

        assertThrows<EmailAlreadyExistsException> {
            authService.register(email, "password1")
        }

        verify(exactly = 0) { userRepository.save(any()) }
    }

    @Test
    fun `register - password is stored as bcrypt hash, not plaintext`() {
        val email = "bob@example.com"
        val password = "mypassw0rd"
        val userSlot = slot<User>()

        every { userRepository.findByEmailAndDeletedAtIsNull(email) } returns null
        every { userRepository.save(capture(userSlot)) } answers { userSlot.captured }

        authService.register(email, password)

        val savedUser = userSlot.captured
        assertFalse(savedUser.passwordHash == password, "Password must not be stored in plaintext")
        assertTrue(
            passwordEncoder.matches(password, savedUser.passwordHash),
            "Stored hash should match the original password"
        )
    }

    // -----------------------------------------------------------------------
    // login
    // -----------------------------------------------------------------------

    @Test
    fun `login - happy path - returns tokens`() {
        val email = "alice@example.com"
        val password = "secret99"
        val user = buildUser(email = email, passwordHash = passwordEncoder.encode(password))

        every { userRepository.findByEmailAndDeletedAtIsNull(email) } returns user
        every { jwtService.generateToken(user) } returns "mock.jwt.token"
        every { jwtService.getExpiresInSeconds() } returns 3600L
        every { refreshTokenRepository.save(any()) } answers { firstArg() }
        every { userMembershipRepository.findAccessibleActiveMembership(user.id, any()) } returns null

        val response = authService.login(email, password)

        assertEquals("mock.jwt.token", response.accessToken)
        assertNotNull(response.refreshToken)
        assertEquals("Bearer", response.tokenType)
        assertEquals(3600L, response.expiresIn)
        assertFalse(response.hasActiveMembership)
    }

    @Test
    fun `login - user with active membership - hasActiveMembership is true`() {
        val email = "member@example.com"
        val password = "secret99"
        val user = buildUser(email = email, passwordHash = passwordEncoder.encode(password))
        val membership = mockk<com.gymflow.domain.UserMembership>()

        every { userRepository.findByEmailAndDeletedAtIsNull(email) } returns user
        every { jwtService.generateToken(user) } returns "mock.jwt.token"
        every { jwtService.getExpiresInSeconds() } returns 3600L
        every { refreshTokenRepository.save(any()) } answers { firstArg() }
        every { userMembershipRepository.findAccessibleActiveMembership(user.id, any()) } returns membership

        val response = authService.login(email, password)

        assertTrue(response.hasActiveMembership)
    }

    @Test
    fun `login - email not found - throws InvalidCredentialsException`() {
        every { userRepository.findByEmailAndDeletedAtIsNull(any()) } returns null

        assertThrows<InvalidCredentialsException> {
            authService.login("unknown@example.com", "password1")
        }
    }

    @Test
    fun `login - wrong password - throws InvalidCredentialsException`() {
        val email = "alice@example.com"
        val user = buildUser(email = email, passwordHash = passwordEncoder.encode("correctpass"))

        every { userRepository.findByEmailAndDeletedAtIsNull(email) } returns user

        assertThrows<InvalidCredentialsException> {
            authService.login(email, "wrongpassword")
        }
    }

    @Test
    fun `login - wrong password and email not found - both throw same exception type`() {
        // Verifies user enumeration is not possible (same exception type for both cases)
        every { userRepository.findByEmailAndDeletedAtIsNull("no@example.com") } returns null

        val ex1 = assertThrows<InvalidCredentialsException> {
            authService.login("no@example.com", "anything")
        }

        val email = "alice@example.com"
        val user = buildUser(email = email, passwordHash = passwordEncoder.encode("correctpass"))
        every { userRepository.findByEmailAndDeletedAtIsNull(email) } returns user

        val ex2 = assertThrows<InvalidCredentialsException> {
            authService.login(email, "wrongpass")
        }

        assertEquals(ex1.message, ex2.message)
    }

    // -----------------------------------------------------------------------
    // refresh
    // -----------------------------------------------------------------------

    @Test
    fun `refresh - happy path - rotates token and returns new tokens`() {
        val userId = UUID.randomUUID()
        val user = buildUser(id = userId)
        // Generate a valid raw token (64 hex chars)
        val rawToken = "a".repeat(64)
        val tokenHash = sha256Hex(rawToken)
        val existingToken = buildRefreshToken(userId = userId, tokenHash = tokenHash)

        every { refreshTokenRepository.findByTokenHashAndInvalidatedFalse(tokenHash) } returns existingToken
        every { refreshTokenRepository.save(existingToken) } returns existingToken
        every { userRepository.findById(userId) } returns Optional.of(user)
        every { jwtService.generateToken(user) } returns "new.jwt.token"
        every { jwtService.getExpiresInSeconds() } returns 3600L
        every { refreshTokenRepository.save(match { it.id != existingToken.id }) } answers { firstArg() }

        val response = authService.refresh(rawToken)

        assertTrue(existingToken.invalidated, "Old token should be marked invalidated")
        assertEquals("new.jwt.token", response.accessToken)
        assertNotNull(response.refreshToken)
    }

    @Test
    fun `refresh - token not found or already invalidated - throws RefreshTokenInvalidException`() {
        val rawToken = "b".repeat(64)
        val tokenHash = sha256Hex(rawToken)

        every { refreshTokenRepository.findByTokenHashAndInvalidatedFalse(tokenHash) } returns null

        assertThrows<RefreshTokenInvalidException> {
            authService.refresh(rawToken)
        }
    }

    @Test
    fun `refresh - token expired - throws RefreshTokenExpiredException`() {
        val userId = UUID.randomUUID()
        val rawToken = "c".repeat(64)
        val tokenHash = sha256Hex(rawToken)
        val expiredToken = buildRefreshToken(
            userId = userId,
            tokenHash = tokenHash,
            expiresAt = OffsetDateTime.now().minusDays(1)
        )

        every { refreshTokenRepository.findByTokenHashAndInvalidatedFalse(tokenHash) } returns expiredToken

        assertThrows<RefreshTokenExpiredException> {
            authService.refresh(rawToken)
        }
    }

    // -----------------------------------------------------------------------
    // logout
    // -----------------------------------------------------------------------

    @Test
    fun `logout - happy path - invalidates refresh token`() {
        val rawToken = "d".repeat(64)
        val tokenHash = sha256Hex(rawToken)
        val userId = UUID.randomUUID()
        val token = buildRefreshToken(userId = userId, tokenHash = tokenHash, invalidated = false)

        every { refreshTokenRepository.findByTokenHash(tokenHash) } returns token
        every { refreshTokenRepository.save(token) } returns token

        authService.logout(rawToken)

        assertTrue(token.invalidated, "Token should be invalidated after logout")
        verify(exactly = 1) { refreshTokenRepository.save(token) }
    }

    @Test
    fun `logout - token already invalidated - does nothing (idempotent)`() {
        val rawToken = "e".repeat(64)
        val tokenHash = sha256Hex(rawToken)
        val userId = UUID.randomUUID()
        val token = buildRefreshToken(userId = userId, tokenHash = tokenHash, invalidated = true)

        every { refreshTokenRepository.findByTokenHash(tokenHash) } returns token

        authService.logout(rawToken)

        // save should NOT be called because token is already invalidated
        verify(exactly = 0) { refreshTokenRepository.save(any()) }
    }

    @Test
    fun `logout - token not found - does nothing (idempotent)`() {
        val rawToken = "f".repeat(64)
        val tokenHash = sha256Hex(rawToken)

        every { refreshTokenRepository.findByTokenHash(tokenHash) } returns null

        authService.logout(rawToken)

        verify(exactly = 0) { refreshTokenRepository.save(any()) }
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private fun buildUser(
        id: UUID = UUID.randomUUID(),
        email: String = "user@example.com",
        passwordHash: String = "hash",
        role: String = "USER"
    ) = User(id = id, email = email, passwordHash = passwordHash, role = role)

    private fun buildRefreshToken(
        userId: UUID,
        tokenHash: String,
        invalidated: Boolean = false,
        expiresAt: OffsetDateTime = OffsetDateTime.now().plusDays(30)
    ) = RefreshToken(
        userId = userId,
        tokenHash = tokenHash,
        expiresAt = expiresAt,
        invalidated = invalidated
    )

    private fun sha256Hex(input: String): String {
        val digest = java.security.MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest(input.toByteArray(Charsets.UTF_8))
        return java.util.HexFormat.of().formatHex(bytes)
    }
}
