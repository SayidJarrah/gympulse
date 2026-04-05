package com.gymflow.service

import com.gymflow.domain.RefreshToken
import com.gymflow.domain.User
import com.gymflow.dto.LoginResponse
import com.gymflow.dto.RegisterResponse
import com.gymflow.repository.RefreshTokenRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.HexFormat

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val userMembershipRepository: UserMembershipRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
    @Value("\${REFRESH_TOKEN_EXPIRY_DAYS:30}") private val refreshTokenExpiryDays: Long
) {

    private val secureRandom = SecureRandom()

    // --- Register ---

    @Transactional
    fun register(email: String, password: String): RegisterResponse {
        if (userRepository.findByEmailAndDeletedAtIsNull(email) != null) {
            throw EmailAlreadyExistsException("An account with email '$email' already exists")
        }

        val user = User(
            email = email,
            passwordHash = passwordEncoder.encode(password),
            role = "USER"
        )
        val saved = userRepository.save(user)

        return RegisterResponse(
            id = saved.id,
            email = saved.email,
            role = saved.role,
            createdAt = saved.createdAt
        )
    }

    // --- Login ---

    @Transactional
    fun login(email: String, password: String): LoginResponse {
        val user = userRepository.findByEmailAndDeletedAtIsNull(email)
            ?: throw InvalidCredentialsException("Invalid email or password")

        if (!passwordEncoder.matches(password, user.passwordHash)) {
            throw InvalidCredentialsException("Invalid email or password")
        }

        val accessToken = jwtService.generateToken(user)
        val (rawRefreshToken, tokenHash) = generateRefreshTokenPair()

        val refreshToken = RefreshToken(
            userId = user.id,
            tokenHash = tokenHash,
            expiresAt = OffsetDateTime.now().plusDays(refreshTokenExpiryDays)
        )
        refreshTokenRepository.save(refreshToken)

        val hasActiveMembership = userMembershipRepository
            .findAccessibleActiveMembership(user.id, LocalDate.now()) != null

        return LoginResponse(
            accessToken = accessToken,
            refreshToken = rawRefreshToken,
            expiresIn = jwtService.getExpiresInSeconds(),
            hasActiveMembership = hasActiveMembership
        )
    }

    // --- Refresh ---

    @Transactional
    fun refresh(rawRefreshToken: String): LoginResponse {
        val tokenHash = sha256Hex(rawRefreshToken)

        val existingToken = refreshTokenRepository.findByTokenHashAndInvalidatedFalse(tokenHash)
            ?: throw RefreshTokenInvalidException("Refresh token is invalid or has been invalidated")

        if (existingToken.expiresAt.isBefore(OffsetDateTime.now())) {
            throw RefreshTokenExpiredException("Refresh token has expired")
        }

        existingToken.invalidated = true
        refreshTokenRepository.save(existingToken)

        val user = userRepository.findById(existingToken.userId)
            .orElseThrow { RefreshTokenInvalidException("Associated user not found") }

        val newAccessToken = jwtService.generateToken(user)
        val (newRawToken, newTokenHash) = generateRefreshTokenPair()

        val newRefreshToken = RefreshToken(
            userId = user.id,
            tokenHash = newTokenHash,
            expiresAt = OffsetDateTime.now().plusDays(refreshTokenExpiryDays)
        )
        refreshTokenRepository.save(newRefreshToken)

        return LoginResponse(
            accessToken = newAccessToken,
            refreshToken = newRawToken,
            expiresIn = jwtService.getExpiresInSeconds()
        )
    }

    // --- Logout ---

    @Transactional
    fun logout(rawRefreshToken: String) {
        val tokenHash = sha256Hex(rawRefreshToken)
        val token = refreshTokenRepository.findByTokenHash(tokenHash)
        if (token != null && !token.invalidated) {
            token.invalidated = true
            refreshTokenRepository.save(token)
        }
        // Idempotent: if not found or already invalidated, do nothing
    }

    // --- Helpers ---

    /**
     * Generates a cryptographically random refresh token:
     * 32 bytes from SecureRandom, hex-encoded to 64 characters.
     * Returns a pair of (rawToken, sha256Hex(rawToken)).
     */
    private fun generateRefreshTokenPair(): Pair<String, String> {
        val bytes = ByteArray(32)
        secureRandom.nextBytes(bytes)
        val rawToken = HexFormat.of().formatHex(bytes)
        return rawToken to sha256Hex(rawToken)
    }

    private fun sha256Hex(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(input.toByteArray(Charsets.UTF_8))
        return HexFormat.of().formatHex(hashBytes)
    }
}

// --- Custom exceptions ---

class EmailAlreadyExistsException(message: String) : RuntimeException(message)
class InvalidCredentialsException(message: String) : RuntimeException(message)
class RefreshTokenInvalidException(message: String) : RuntimeException(message)
class RefreshTokenExpiredException(message: String) : RuntimeException(message)
