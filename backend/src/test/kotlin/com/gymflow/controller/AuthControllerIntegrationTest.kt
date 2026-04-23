package com.gymflow.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.gymflow.domain.RefreshToken
import com.gymflow.domain.User
import com.gymflow.dto.LoginRequest
import com.gymflow.dto.LogoutRequest
import com.gymflow.dto.RefreshRequest
import com.gymflow.dto.RegisterRequest
import com.gymflow.domain.UserProfile
import com.gymflow.repository.RefreshTokenRepository
import com.gymflow.repository.UserProfileRepository
import com.gymflow.repository.UserRepository
import com.gymflow.service.JwtService
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.given
import org.mockito.Mockito.doNothing
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.OffsetDateTime
import java.util.Optional
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @MockBean
    private lateinit var userRepository: UserRepository

    @MockBean
    private lateinit var refreshTokenRepository: RefreshTokenRepository

    @MockBean
    private lateinit var userProfileRepository: UserProfileRepository

    @Autowired
    private lateinit var passwordEncoder: BCryptPasswordEncoder

    @Autowired
    private lateinit var jwtService: JwtService

    // -----------------------------------------------------------------------
    // POST /api/v1/auth/register
    // -----------------------------------------------------------------------

    @Test
    fun `register - 201 on valid combined request`() {
        val email = "alice@example.com"
        given(userRepository.findByEmailAndDeletedAtIsNull(email)).willReturn(null)
        given(userRepository.save(any(User::class.java))).willAnswer { invocation ->
            invocation.arguments[0] as User
        }
        given(userProfileRepository.save(any(UserProfile::class.java))).willAnswer { invocation ->
            invocation.arguments[0] as UserProfile
        }
        given(refreshTokenRepository.save(any(RefreshToken::class.java))).willAnswer { invocation ->
            invocation.arguments[0] as RefreshToken
        }

        mockMvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegisterRequest(email = email)))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.refreshToken").exists())
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.expiresIn").exists())
    }

    @Test
    fun `register - 400 on invalid email format`() {
        mockMvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegisterRequest(email = "not-an-email")))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `register - 400 when password is shorter than 8 chars`() {
        mockMvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegisterRequest(password = "short")))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `register - 400 when password is longer than 15 chars`() {
        mockMvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegisterRequest(password = "thispasswordiswaytoolong")))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `register - 400 when agreeTerms is false`() {
        mockMvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegisterRequest(agreeTerms = false)))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `register - 400 when agreeWaiver is false`() {
        mockMvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegisterRequest(agreeWaiver = false)))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
    }

    @Test
    fun `register - 409 on duplicate email`() {
        val email = "alice@example.com"
        val existingUser = buildUser(email = email)
        given(userRepository.findByEmailAndDeletedAtIsNull(email)).willReturn(existingUser)

        mockMvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegisterRequest(email = email)))
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"))
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/auth/login
    // -----------------------------------------------------------------------

    @Test
    fun `login - 200 on valid credentials`() {
        val email = "alice@example.com"
        val password = "secret99"
        val user = buildUser(email = email, passwordHash = passwordEncoder.encode(password))

        given(userRepository.findByEmailAndDeletedAtIsNull(email)).willReturn(user)
        given(refreshTokenRepository.save(any(RefreshToken::class.java))).willAnswer { invocation ->
            invocation.arguments[0] as RefreshToken
        }

        mockMvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(LoginRequest(email, password)))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.refreshToken").exists())
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.expiresIn").value(3600))
    }

    @Test
    fun `login - 401 when email not found`() {
        given(userRepository.findByEmailAndDeletedAtIsNull(org.mockito.ArgumentMatchers.anyString())).willReturn(null)

        mockMvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(LoginRequest("ghost@example.com", "secret99")))
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
    }

    @Test
    fun `login - 401 when password is wrong`() {
        val email = "alice@example.com"
        val user = buildUser(email = email, passwordHash = passwordEncoder.encode("correctpass"))
        given(userRepository.findByEmailAndDeletedAtIsNull(email)).willReturn(user)

        mockMvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(LoginRequest(email, "wrongpassword")))
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/auth/refresh
    // -----------------------------------------------------------------------

    @Test
    fun `refresh - 200 on valid refresh token`() {
        val rawToken = "a".repeat(64)
        val tokenHash = sha256Hex(rawToken)
        val userId = UUID.randomUUID()
        val user = buildUser(id = userId)
        val refreshToken = buildRefreshToken(userId = userId, tokenHash = tokenHash)

        given(refreshTokenRepository.findByTokenHashAndInvalidatedFalse(tokenHash)).willReturn(refreshToken)
        given(refreshTokenRepository.save(any(RefreshToken::class.java))).willAnswer { invocation ->
            invocation.arguments[0] as RefreshToken
        }
        given(userRepository.findById(userId)).willReturn(Optional.of(user))

        mockMvc.perform(
            post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(RefreshRequest(rawToken)))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.refreshToken").exists())
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
    }

    @Test
    fun `refresh - 401 on invalid or invalidated token`() {
        val rawToken = "b".repeat(64)
        val tokenHash = sha256Hex(rawToken)

        given(refreshTokenRepository.findByTokenHashAndInvalidatedFalse(tokenHash)).willReturn(null)

        mockMvc.perform(
            post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(RefreshRequest(rawToken)))
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_INVALID"))
    }

    @Test
    fun `refresh - 401 on expired token`() {
        val rawToken = "c".repeat(64)
        val tokenHash = sha256Hex(rawToken)
        val userId = UUID.randomUUID()
        val expiredToken = buildRefreshToken(
            userId = userId,
            tokenHash = tokenHash,
            expiresAt = OffsetDateTime.now().minusDays(1)
        )

        given(refreshTokenRepository.findByTokenHashAndInvalidatedFalse(tokenHash)).willReturn(expiredToken)

        mockMvc.perform(
            post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(RefreshRequest(rawToken)))
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_EXPIRED"))
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/auth/logout
    // -----------------------------------------------------------------------

    @Test
    fun `logout - 204 with valid access token and refresh token`() {
        val userId = UUID.randomUUID()
        val user = buildUser(id = userId)
        val accessToken = jwtService.generateToken(user)
        val rawRefreshToken = "d".repeat(64)
        val tokenHash = sha256Hex(rawRefreshToken)
        val refreshToken = buildRefreshToken(userId = userId, tokenHash = tokenHash)

        given(refreshTokenRepository.findByTokenHash(tokenHash)).willReturn(refreshToken)
        given(refreshTokenRepository.save(any(RefreshToken::class.java))).willAnswer { invocation ->
            invocation.arguments[0] as RefreshToken
        }

        mockMvc.perform(
            post("/api/v1/auth/logout")
                .header("Authorization", "Bearer $accessToken")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(LogoutRequest(rawRefreshToken)))
        )
            .andExpect(status().isNoContent)
    }

    @Test
    fun `logout - 204 when refresh token already invalidated (idempotent)`() {
        val userId = UUID.randomUUID()
        val user = buildUser(id = userId)
        val accessToken = jwtService.generateToken(user)
        val rawRefreshToken = "e".repeat(64)
        val tokenHash = sha256Hex(rawRefreshToken)
        val invalidatedToken = buildRefreshToken(userId = userId, tokenHash = tokenHash, invalidated = true)

        given(refreshTokenRepository.findByTokenHash(tokenHash)).willReturn(invalidatedToken)

        mockMvc.perform(
            post("/api/v1/auth/logout")
                .header("Authorization", "Bearer $accessToken")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(LogoutRequest(rawRefreshToken)))
        )
            .andExpect(status().isNoContent)
    }

    @Test
    fun `logout - 401 when no access token provided`() {
        mockMvc.perform(
            post("/api/v1/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(LogoutRequest("sometoken")))
        )
            .andExpect(status().isUnauthorized)
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private fun buildRegisterRequest(
        email: String = "user@example.com",
        password: String = "secret99",
        firstName: String = "Jane",
        lastName: String = "Smith",
        phone: String = "+15555550100",
        dateOfBirth: String = "1992-04-17",
        agreeTerms: Boolean = true,
        agreeWaiver: Boolean = true
    ) = RegisterRequest(
        email = email,
        password = password,
        firstName = firstName,
        lastName = lastName,
        phone = phone,
        dateOfBirth = dateOfBirth,
        agreeTerms = agreeTerms,
        agreeWaiver = agreeWaiver
    )

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
