package com.gymflow.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "bookings")
data class Booking(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false, updatable = false)
    val userId: UUID,

    @Column(name = "class_id", nullable = false, updatable = false)
    val classId: UUID,

    @Column(nullable = false)
    var status: String = "CONFIRMED",

    @Column(name = "booked_at", nullable = false, updatable = false)
    val bookedAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "cancelled_at")
    var cancelledAt: OffsetDateTime? = null,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "deleted_at")
    var deletedAt: OffsetDateTime? = null
)
