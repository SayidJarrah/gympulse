package com.gymflow.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "trainers")
data class Trainer(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "first_name", nullable = false)
    var firstName: String,

    @Column(name = "last_name", nullable = false)
    var lastName: String,

    @Column(nullable = false)
    var email: String,

    @Column
    var phone: String? = null,

    @Column
    var bio: String? = null,

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    var specialisations: List<String> = emptyList(),

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "photo_data")
    var photoData: ByteArray? = null,

    @Column(name = "photo_mime_type")
    var photoMimeType: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "deleted_at")
    var deletedAt: OffsetDateTime? = null,

    @Column(name = "experience_years")
    var experienceYears: Int? = null,

    @Column(name = "profile_photo_url")
    var profilePhotoUrl: String? = null
)
