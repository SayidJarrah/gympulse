package com.gymflow.repository

import com.gymflow.domain.PtBooking
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import jakarta.persistence.LockModeType
import java.time.OffsetDateTime
import java.util.UUID

interface PtBookingRepository : JpaRepository<PtBooking, UUID> {

    /** Check for confirmed PT booking by the same trainer that overlaps [start, end) */
    @Query("""
        SELECT COUNT(b) FROM PtBooking b
        WHERE b.trainerId = :trainerId
          AND b.status = 'CONFIRMED'
          AND b.startAt < :endAt
          AND b.endAt > :startAt
    """)
    fun countTrainerOverlap(
        @Param("trainerId") trainerId: UUID,
        @Param("startAt") startAt: OffsetDateTime,
        @Param("endAt") endAt: OffsetDateTime
    ): Long

    /** Load confirmed PT bookings for a trainer in a time window (for availability algorithm) */
    @Query("""
        SELECT b FROM PtBooking b
        WHERE b.trainerId = :trainerId
          AND b.status = 'CONFIRMED'
          AND b.startAt < :windowEnd
          AND b.endAt > :windowStart
    """)
    fun findConfirmedByTrainerInWindow(
        @Param("trainerId") trainerId: UUID,
        @Param("windowStart") windowStart: OffsetDateTime,
        @Param("windowEnd") windowEnd: OffsetDateTime
    ): List<PtBooking>

    /** Member's own bookings, optionally filtered by status */
    @Query("""
        SELECT b FROM PtBooking b
        WHERE b.memberId = :memberId
          AND (:status IS NULL OR b.status = :status)
        ORDER BY b.startAt ASC
    """)
    fun findByMemberIdAndStatus(
        @Param("memberId") memberId: UUID,
        @Param("status") status: String?,
        pageable: Pageable
    ): Page<PtBooking>

    /** Find a specific booking by id and memberId (for ownership check on cancel) */
    fun findByIdAndMemberId(id: UUID, memberId: UUID): PtBooking?

    /** Admin: list all PT bookings with optional filters */
    @Query("""
        SELECT b FROM PtBooking b
        WHERE (:trainerId IS NULL OR b.trainerId = :trainerId)
          AND (:status IS NULL OR b.status = :status)
          AND (:windowStart IS NULL OR b.startAt >= :windowStart)
          AND (:windowEnd IS NULL OR b.startAt <= :windowEnd)
        ORDER BY b.startAt ASC
    """)
    fun findAdminSessions(
        @Param("trainerId") trainerId: UUID?,
        @Param("status") status: String?,
        @Param("windowStart") windowStart: OffsetDateTime?,
        @Param("windowEnd") windowEnd: OffsetDateTime?,
        pageable: Pageable
    ): Page<PtBooking>

    /** Admin stats */
    @Query("""
        SELECT COUNT(b) FROM PtBooking b WHERE b.status = 'CONFIRMED'
    """)
    fun countActive(): Long

    @Query("""
        SELECT COUNT(DISTINCT b.memberId) FROM PtBooking b WHERE b.status = 'CONFIRMED'
    """)
    fun countUniqueMembers(): Long

    @Query("""
        SELECT COUNT(DISTINCT b.trainerId) FROM PtBooking b WHERE b.status = 'CONFIRMED'
    """)
    fun countUniqueTrainers(): Long

    @Query("""
        SELECT COUNT(b) FROM PtBooking b WHERE b.status = 'CANCELLED'
    """)
    fun countCancelled(): Long

    /** Trainer's own confirmed PT bookings in a window */
    @Query("""
        SELECT b FROM PtBooking b
        WHERE b.trainerId = :trainerId
          AND b.status = 'CONFIRMED'
          AND b.startAt >= :windowStart
          AND b.startAt < :windowEnd
        ORDER BY b.startAt ASC
    """)
    fun findConfirmedByTrainerInRange(
        @Param("trainerId") trainerId: UUID,
        @Param("windowStart") windowStart: OffsetDateTime,
        @Param("windowEnd") windowEnd: OffsetDateTime
    ): List<PtBooking>

    /** Count all confirmed PT sessions for a trainer (for sessionsCompleted metric) */
    @Query("""
        SELECT COUNT(b) FROM PtBooking b
        WHERE b.trainerId = :trainerId
          AND b.status = 'CONFIRMED'
    """)
    fun countConfirmedByTrainer(@Param("trainerId") trainerId: UUID): Long
}
