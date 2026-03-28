package com.gymflow.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "class_instances")
data class ClassInstance(
    @Id
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    var template: ClassTemplate? = null,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    var type: String = "GROUP",

    @Column(name = "scheduled_at", nullable = false)
    var scheduledAt: OffsetDateTime,

    @Column(name = "duration_min", nullable = false)
    var durationMin: Int,

    @Column(nullable = false)
    var capacity: Int,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    var room: Room? = null,

    @ManyToMany
    @JoinTable(
        name = "class_instance_trainers",
        joinColumns = [JoinColumn(name = "class_instance_id")],
        inverseJoinColumns = [JoinColumn(name = "trainer_id")]
    )
    var trainers: MutableSet<Trainer> = mutableSetOf(),

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "deleted_at")
    var deletedAt: OffsetDateTime? = null
)
