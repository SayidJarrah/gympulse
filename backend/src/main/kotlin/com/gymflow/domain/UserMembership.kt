package com.gymflow.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "user_memberships")
data class UserMembership(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false, updatable = false)
    val userId: UUID,

    @Column(name = "plan_id", nullable = false, updatable = false)
    val planId: UUID,

    @Column(nullable = false)
    var status: String = "ACTIVE",

    @Column(name = "start_date", nullable = false, updatable = false)
    val startDate: LocalDate,

    @Column(name = "end_date", nullable = false)
    var endDate: LocalDate,

    @Column(name = "bookings_used_this_month", nullable = false)
    var bookingsUsedThisMonth: Int = 0,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime = OffsetDateTime.now()
)
