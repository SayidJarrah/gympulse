package com.gymflow.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "class_templates")
data class ClassTemplate(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var name: String,

    @Column
    var description: String? = null,

    @Column(nullable = false)
    var category: String,

    @Column(name = "default_duration_min", nullable = false)
    var defaultDurationMin: Int,

    @Column(name = "default_capacity", nullable = false)
    var defaultCapacity: Int,

    @Column(nullable = false)
    var difficulty: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    var room: Room? = null,

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "photo_data")
    var photoData: ByteArray? = null,

    @Column(name = "photo_mime_type")
    var photoMimeType: String? = null,

    @Column(name = "is_seeded", nullable = false)
    var isSeeded: Boolean = false,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime = OffsetDateTime.now()
)
