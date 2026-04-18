package com.gymflow.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "user_profiles")
data class UserProfile(
    @Id
    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Column(name = "first_name")
    var firstName: String? = null,

    @Column(name = "last_name")
    var lastName: String? = null,

    @Column
    var phone: String? = null,

    @Column(name = "date_of_birth")
    var dateOfBirth: LocalDate? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "fitness_goals", nullable = false)
    var fitnessGoals: MutableList<String> = mutableListOf(),

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferred_class_types", nullable = false)
    var preferredClassTypes: MutableList<String> = mutableListOf(),

    @Column(name = "emergency_contact_name")
    var emergencyContactName: String? = null,

    @Column(name = "emergency_contact_phone")
    var emergencyContactPhone: String? = null,

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "profile_photo_data")
    var profilePhotoData: ByteArray? = null,

    @Column(name = "profile_photo_mime_type")
    var profilePhotoMimeType: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "deleted_at")
    var deletedAt: OffsetDateTime? = null
)
