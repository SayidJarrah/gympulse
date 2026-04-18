package com.gymflow.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "pt_bookings")
data class PtBooking(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "trainer_id", nullable = false)
    val trainerId: UUID,

    @Column(name = "member_id", nullable = false)
    val memberId: UUID,

    @Column(name = "start_at", nullable = false)
    var startAt: OffsetDateTime,

    @Column(name = "end_at", nullable = false)
    var endAt: OffsetDateTime,

    @Column(nullable = false)
    var room: String = "",

    @Column
    var note: String? = null,

    @Column(nullable = false)
    var status: String = PT_STATUS_CONFIRMED,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "cancelled_at")
    var cancelledAt: OffsetDateTime? = null
) {
    companion object {
        const val PT_STATUS_CONFIRMED = "CONFIRMED"
        const val PT_STATUS_CANCELLED = "CANCELLED"
    }
}
