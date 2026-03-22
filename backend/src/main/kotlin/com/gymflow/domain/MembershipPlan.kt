package com.gymflow.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "membership_plans")
data class MembershipPlan(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false, columnDefinition = "TEXT")
    var description: String,

    @Column(name = "price_in_cents", nullable = false)
    var priceInCents: Int,

    @Column(name = "duration_days", nullable = false)
    var durationDays: Int,

    @Column(nullable = false)
    var status: String = "ACTIVE",

    @Version
    @Column(nullable = false)
    var version: Int = 0,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime = OffsetDateTime.now()
)
