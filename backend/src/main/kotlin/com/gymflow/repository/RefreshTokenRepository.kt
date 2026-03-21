package com.gymflow.repository

import com.gymflow.domain.RefreshToken
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface RefreshTokenRepository : JpaRepository<RefreshToken, UUID> {
    fun findByTokenHashAndInvalidatedFalse(hash: String): RefreshToken?
    fun findByTokenHash(hash: String): RefreshToken?
}
