package com.gymflow.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "activity_events")
class ActivityEvent(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, length = 10)
    val kind: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    val actor: User? = null,

    @Column(name = "actor_name", nullable = false, length = 200)
    val actorName: String,

    @Column(nullable = false, length = 500)
    val text: String,

    @Column(name = "text_public", nullable = false, length = 500)
    val textPublic: String,

    @Column(name = "occurred_at", nullable = false)
    val occurredAt: OffsetDateTime = OffsetDateTime.now()
)
