package com.gymflow.repository

import com.gymflow.domain.ClassInstance
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.OffsetDateTime
import java.util.UUID

interface ClassInstanceRepository : JpaRepository<ClassInstance, UUID> {
    @Query(
        """
        SELECT DISTINCT ci FROM ClassInstance ci
        LEFT JOIN FETCH ci.trainers t
        LEFT JOIN FETCH ci.room r
        LEFT JOIN FETCH ci.template tpl
        WHERE ci.deletedAt IS NULL
          AND ci.scheduledAt >= :start
          AND ci.scheduledAt < :end
        """
    )
    fun findWithDetailsBetween(
        @Param("start") start: OffsetDateTime,
        @Param("end") end: OffsetDateTime
    ): List<ClassInstance>

    @Query(
        """
        SELECT DISTINCT ci FROM ClassInstance ci
        LEFT JOIN FETCH ci.trainers t
        LEFT JOIN FETCH ci.template tpl
        WHERE ci.deletedAt IS NULL
          AND ci.type = 'GROUP'
          AND ci.status = 'SCHEDULED'
          AND ci.scheduledAt >= :start
          AND ci.scheduledAt < :end
        """
    )
    fun findVisibleGroupScheduleBetween(
        @Param("start") start: OffsetDateTime,
        @Param("end") end: OffsetDateTime
    ): List<ClassInstance>

    @Query(
        value = """
        SELECT ci.id
        FROM class_instances ci
        WHERE ci.deleted_at IS NULL
          AND ci.type = 'GROUP'
          AND ci.status = 'SCHEDULED'
          AND ci.scheduled_at > NOW()
          AND ci.scheduled_at < :rangeEndUtcExclusive
        ORDER BY ci.scheduled_at ASC
        LIMIT 8
        """,
        nativeQuery = true
    )
    fun findUpcomingGroupPreviewIds(
        @Param("rangeEndUtcExclusive") rangeEndUtcExclusive: OffsetDateTime
    ): List<UUID>

    @Query(
        """
        SELECT DISTINCT ci FROM ClassInstance ci
        LEFT JOIN FETCH ci.trainers t
        LEFT JOIN FETCH ci.template tpl
        WHERE ci.deletedAt IS NULL
          AND ci.id IN :ids
        """
    )
    fun findPreviewDetailsByIds(@Param("ids") ids: Collection<UUID>): List<ClassInstance>

    @Query(
        """
        SELECT DISTINCT ci FROM ClassInstance ci
        LEFT JOIN FETCH ci.trainers t
        LEFT JOIN FETCH ci.room r
        LEFT JOIN FETCH ci.template tpl
        WHERE ci.id = :id
        """
    )
    fun findWithDetailsById(@Param("id") id: UUID): ClassInstance?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        """
        SELECT ci FROM ClassInstance ci
        WHERE ci.id = :id
          AND ci.deletedAt IS NULL
        """
    )
    fun findActiveByIdForUpdate(@Param("id") id: UUID): ClassInstance?

    @Query(
        value = """
        SELECT ci.* FROM class_instances ci
        JOIN class_instance_trainers cit ON cit.class_instance_id = ci.id
        WHERE cit.trainer_id = :trainerId
          AND ci.deleted_at IS NULL
          AND ci.scheduled_at < :endTime
          AND (ci.scheduled_at + ci.duration_min * INTERVAL '1 minute') > :startTime
        """,
        nativeQuery = true
    )
    fun findTrainerOverlaps(
        @Param("trainerId") trainerId: UUID,
        @Param("startTime") startTime: OffsetDateTime,
        @Param("endTime") endTime: OffsetDateTime
    ): List<ClassInstance>

    @Query(
        value = """
        SELECT ci.* FROM class_instances ci
        JOIN class_instance_trainers cit ON cit.class_instance_id = ci.id
        WHERE cit.trainer_id = :trainerId
          AND ci.deleted_at IS NULL
          AND ci.id <> :excludeId
          AND ci.scheduled_at < :endTime
          AND (ci.scheduled_at + ci.duration_min * INTERVAL '1 minute') > :startTime
        """,
        nativeQuery = true
    )
    fun findTrainerOverlapsExcluding(
        @Param("trainerId") trainerId: UUID,
        @Param("excludeId") excludeId: UUID,
        @Param("startTime") startTime: OffsetDateTime,
        @Param("endTime") endTime: OffsetDateTime
    ): List<ClassInstance>

    @Query(
        value = """
        SELECT COUNT(*) FROM class_instances ci
        WHERE ci.deleted_at IS NULL
          AND ci.room_id = :roomId
          AND ci.scheduled_at < :endTime
          AND (ci.scheduled_at + ci.duration_min * INTERVAL '1 minute') > :startTime
          AND (:excludeId IS NULL OR ci.id <> :excludeId)
        """,
        nativeQuery = true
    )
    fun countRoomOverlaps(
        @Param("roomId") roomId: UUID,
        @Param("startTime") startTime: OffsetDateTime,
        @Param("endTime") endTime: OffsetDateTime,
        @Param("excludeId") excludeId: UUID?
    ): Long

    fun findByRoomIdAndDeletedAtIsNull(roomId: UUID): List<ClassInstance>

    fun findByTemplateIdAndDeletedAtIsNull(templateId: UUID): List<ClassInstance>

    fun existsByScheduledAtAndName(scheduledAt: OffsetDateTime, name: String): Boolean

    @Query(
        """
        SELECT DISTINCT ci FROM ClassInstance ci
        JOIN ci.trainers t
        WHERE t.id = :trainerId
          AND ci.deletedAt IS NULL
        """
    )
    fun findByTrainerId(@Param("trainerId") trainerId: UUID): List<ClassInstance>

    @Modifying
    @Query("UPDATE ClassInstance ci SET ci.room = null WHERE ci.room.id = :roomId")
    fun clearRoomAssignments(@Param("roomId") roomId: UUID)

    @Modifying
    @Query("UPDATE ClassInstance ci SET ci.template = null WHERE ci.template.id = :templateId")
    fun clearTemplateAssignments(@Param("templateId") templateId: UUID)

    @Query(
        value = """
        SELECT cit.trainer_id AS trainerId, COUNT(*) AS classCount
        FROM class_instance_trainers cit
        JOIN class_instances ci ON ci.id = cit.class_instance_id
        WHERE cit.trainer_id IN (:trainerIds)
          AND ci.deleted_at IS NULL
          AND ci.status = 'SCHEDULED'
        GROUP BY cit.trainer_id
        """,
        nativeQuery = true
    )
    fun countScheduledClassesForTrainers(
        @Param("trainerIds") trainerIds: Collection<UUID>
    ): List<Array<Any>>

    @Query(
        value = """
        SELECT
            EXTRACT(DOW FROM ci.scheduled_at AT TIME ZONE 'UTC') AS day_of_week_int,
            EXTRACT(HOUR FROM ci.scheduled_at AT TIME ZONE 'UTC') AS hour_of_day
        FROM class_instances ci
        JOIN class_instance_trainers cit ON cit.class_instance_id = ci.id
        WHERE cit.trainer_id = :trainerId
          AND ci.deleted_at IS NULL
          AND ci.status = 'SCHEDULED'
        """,
        nativeQuery = true
    )
    fun findScheduledDayHoursByTrainer(
        @Param("trainerId") trainerId: UUID
    ): List<Array<Any>>
}
