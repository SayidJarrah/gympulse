package com.gymflow.repository

import com.gymflow.domain.Booking
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface BookingRepository : JpaRepository<Booking, UUID> {

    @Query(
        """
        SELECT COUNT(b) FROM Booking b
        WHERE b.classId = :classId
          AND b.status = 'CONFIRMED'
          AND b.deletedAt IS NULL
        """
    )
    fun countConfirmedByClassId(@Param("classId") classId: UUID): Long

    @Query(
        """
        SELECT b.classId, COUNT(b) FROM Booking b
        WHERE b.classId IN :classIds
          AND b.status = 'CONFIRMED'
          AND b.deletedAt IS NULL
        GROUP BY b.classId
        """
    )
    fun countConfirmedByClassIds(@Param("classIds") classIds: Collection<UUID>): List<Array<Any>>

    @Query(
        """
        SELECT b FROM Booking b
        WHERE b.userId = :userId
          AND b.classId = :classId
          AND b.status = 'CONFIRMED'
          AND b.deletedAt IS NULL
        """
    )
    fun findConfirmedByUserIdAndClassId(
        @Param("userId") userId: UUID,
        @Param("classId") classId: UUID
    ): Booking?

    @Query(
        """
        SELECT b FROM Booking b
        WHERE b.userId = :userId
          AND b.classId IN :classIds
          AND b.status = 'CONFIRMED'
          AND b.deletedAt IS NULL
        """
    )
    fun findConfirmedByUserIdAndClassIds(
        @Param("userId") userId: UUID,
        @Param("classIds") classIds: Collection<UUID>
    ): List<Booking>

    @Query(
        """
        SELECT b FROM Booking b
        WHERE b.id = :bookingId
          AND b.userId = :userId
          AND b.deletedAt IS NULL
        """
    )
    fun findByIdAndUserId(
        @Param("bookingId") bookingId: UUID,
        @Param("userId") userId: UUID
    ): Booking?

    @Modifying
    @Query("DELETE FROM Booking b WHERE b.userId IN :userIds")
    fun deleteAllByUserIds(@Param("userIds") userIds: Collection<UUID>): Int

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        """
        SELECT b FROM Booking b
        WHERE b.id = :bookingId
          AND b.userId = :userId
          AND b.deletedAt IS NULL
        """
    )
    fun findByIdAndUserIdForUpdate(
        @Param("bookingId") bookingId: UUID,
        @Param("userId") userId: UUID
    ): Booking?

    @Query(
        value = """
        SELECT b.id
        FROM bookings b
        JOIN class_instances ci ON ci.id = b.class_id
        WHERE b.user_id = :userId
          AND b.deleted_at IS NULL
          AND (:status IS NULL OR b.status = :status)
        ORDER BY ci.scheduled_at ASC, b.booked_at DESC
        """,
        countQuery = """
        SELECT COUNT(*)
        FROM bookings b
        JOIN class_instances ci ON ci.id = b.class_id
        WHERE b.user_id = :userId
          AND b.deleted_at IS NULL
          AND (:status IS NULL OR b.status = :status)
        """,
        nativeQuery = true
    )
    fun findBookingIdsForUser(
        @Param("userId") userId: UUID,
        @Param("status") status: String?,
        pageable: Pageable
    ): Page<UUID>
}
