package com.gymflow.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table
import java.io.Serializable
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "user_trainer_favorites")
@IdClass(UserTrainerFavoriteId::class)
data class UserTrainerFavorite(
    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    val userId: UUID,

    @Id
    @Column(name = "trainer_id", nullable = false, updatable = false)
    val trainerId: UUID,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now()
)

data class UserTrainerFavoriteId(
    val userId: UUID = UUID.randomUUID(),
    val trainerId: UUID = UUID.randomUUID()
) : Serializable
