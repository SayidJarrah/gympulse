package com.gymflow.service

import com.gymflow.domain.User
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import jakarta.annotation.PostConstruct
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.Date

@Service
class JwtService(
    @Value("\${JWT_SECRET:#{null}}") private val jwtSecret: String?,
    @Value("\${JWT_EXPIRY_MS:3600000}") private val jwtExpiryMs: Long
) {

    @PostConstruct
    fun validateSecret() {
        val secret = jwtSecret
            ?: throw IllegalStateException("JWT_SECRET environment variable is not set")
        check(secret.length >= 32) {
            "JWT_SECRET must be at least 32 characters (256 bits) for HS256; " +
                "current length is ${secret.length}"
        }
    }

    private fun signingKey() = Keys.hmacShaKeyFor(jwtSecret!!.toByteArray())

    fun generateToken(user: User): String {
        val now = System.currentTimeMillis()
        return Jwts.builder()
            .subject(user.id.toString())
            .claim("role", user.role)
            .issuedAt(Date(now))
            .expiration(Date(now + jwtExpiryMs))
            .signWith(signingKey())
            .compact()
    }

    fun validateToken(token: String): Claims {
        return Jwts.parser()
            .verifyWith(signingKey())
            .build()
            .parseSignedClaims(token)
            .payload
    }

    fun getExpiresInSeconds(): Long = jwtExpiryMs / 1000
}
