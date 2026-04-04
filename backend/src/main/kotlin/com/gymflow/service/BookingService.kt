package com.gymflow.service

import com.gymflow.domain.Booking
import com.gymflow.domain.ClassInstance
import com.gymflow.domain.Trainer
import com.gymflow.domain.UserMembership
import com.gymflow.dto.AdminBookingMemberSummaryResponse
import com.gymflow.dto.AdminBookingRequest
import com.gymflow.dto.BookingRequest
import com.gymflow.dto.BookingResponse
import com.gymflow.exception.MembershipRequiredException
import com.gymflow.repository.BookingRepository
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Locale
import java.util.UUID

@Service
class BookingService(
    private val bookingRepository: BookingRepository,
    private val classInstanceRepository: ClassInstanceRepository,
    private val userMembershipRepository: UserMembershipRepository,
    private val userRepository: UserRepository
) {

    @Transactional
    fun createBooking(userId: UUID, request: BookingRequest): BookingResponse {
        val classId = parseRequiredUuid(request.classId, ::InvalidClassIdException)
        val membership = userMembershipRepository.findAccessibleActiveMembershipForUpdate(userId, LocalDate.now(ZoneOffset.UTC))
            ?: throw MembershipRequiredException()

        return createBookingInternal(targetUserId = userId, classId = classId, membershipToIncrement = membership)
    }

    @Transactional
    fun createBookingForUser(request: AdminBookingRequest): BookingResponse {
        val userId = parseRequiredUuid(request.userId, ::InvalidUserIdException)
        val classId = parseRequiredUuid(request.classId, ::InvalidClassIdException)
        val user = userRepository.findByIdAndRoleAndDeletedAtIsNull(userId, "USER")
            ?: throw UserNotFoundException("User not found")
        val membership = userMembershipRepository.findAccessibleActiveMembershipForUpdate(user.id, LocalDate.now(ZoneOffset.UTC))

        return createBookingInternal(targetUserId = user.id, classId = classId, membershipToIncrement = membership)
    }

    @Transactional(readOnly = true)
    fun getMyBookings(userId: UUID, status: String?, pageable: Pageable): Page<BookingResponse> {
        val normalizedStatus = status?.let(::normalizeStatus)
        val requestedPageable = PageRequest.of(pageable.pageNumber, pageable.pageSize)
        val bookingIdsPage = bookingRepository.findBookingIdsForUser(userId, normalizedStatus, requestedPageable)
        if (bookingIdsPage.content.isEmpty()) {
            return Page.empty(requestedPageable)
        }

        val bookings = bookingRepository.findAllById(bookingIdsPage.content).associateBy { it.id }
        val classDetails = classInstanceRepository.findPreviewDetailsByIds(
            bookingIdsPage.content.mapNotNull { bookings[it]?.classId }.distinct()
        ).associateBy { it.id }
        val now = OffsetDateTime.now(ZoneOffset.UTC)

        val responses = bookingIdsPage.content.mapNotNull { bookingId ->
            val booking = bookings[bookingId] ?: return@mapNotNull null
            val classInstance = classDetails[booking.classId] ?: return@mapNotNull null
            booking.toResponse(classInstance, now)
        }

        return PageImpl(responses, requestedPageable, bookingIdsPage.totalElements)
    }

    @Transactional
    fun cancelBooking(userId: UUID, bookingId: UUID): BookingResponse {
        val existing = bookingRepository.findByIdAndUserId(bookingId, userId)
            ?: throw BookingNotFoundException("Booking not found")

        val classInstance = classInstanceRepository.findActiveByIdForUpdate(existing.classId)
            ?: throw BookingNotFoundException("Booking not found")
        val booking = bookingRepository.findByIdAndUserIdForUpdate(bookingId, userId)
            ?: throw BookingNotFoundException("Booking not found")

        if (booking.status != BOOKING_STATUS_CONFIRMED) {
            throw BookingNotActiveException("Booking is not active")
        }

        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val cutoffAt = classInstance.scheduledAt.minusHours(CANCELLATION_CUTOFF_HOURS)
        if (!now.isBefore(cutoffAt)) {
            throw CancellationWindowClosedException("Cancellation window closed")
        }

        booking.status = BOOKING_STATUS_CANCELLED
        booking.cancelledAt = now

        val detailedClass = classInstanceRepository.findWithDetailsById(classInstance.id)
            ?: classInstance
        return bookingRepository.save(booking).toResponse(detailedClass, now)
    }

    @Transactional(readOnly = true)
    fun searchBookingMembers(query: String?, pageable: Pageable): Page<AdminBookingMemberSummaryResponse> {
        val trimmedQuery = query?.trim().orEmpty()
        val sanitizedPageable = PageRequest.of(pageable.pageNumber, pageable.pageSize.coerceAtMost(20))
        if (trimmedQuery.isBlank()) {
            return Page.empty(sanitizedPageable)
        }

        return userRepository.searchBookingMembers(trimmedQuery, LocalDate.now(ZoneOffset.UTC), sanitizedPageable)
    }

    @Transactional(readOnly = true)
    fun countConfirmedBookings(classIds: Collection<UUID>): Map<UUID, Long> {
        if (classIds.isEmpty()) {
            return emptyMap()
        }

        return bookingRepository.countConfirmedByClassIds(classIds).associate { row ->
            row[0] as UUID to (row[1] as Long)
        }
    }

    @Transactional(readOnly = true)
    fun findConfirmedBookingsByUserAndClassIds(userId: UUID, classIds: Collection<UUID>): Map<UUID, Booking> {
        if (classIds.isEmpty()) {
            return emptyMap()
        }

        return bookingRepository.findConfirmedByUserIdAndClassIds(userId, classIds).associateBy { it.classId }
    }

    @Transactional(readOnly = true)
    fun countConfirmedBookings(classId: UUID): Long = bookingRepository.countConfirmedByClassId(classId)

    private fun createBookingInternal(
        targetUserId: UUID,
        classId: UUID,
        membershipToIncrement: UserMembership?
    ): BookingResponse {
        val classInstance = classInstanceRepository.findActiveByIdForUpdate(classId)
            ?: throw ClassNotFoundException("Class not found")

        validateBookableClass(classInstance)

        if (bookingRepository.findConfirmedByUserIdAndClassId(targetUserId, classId) != null) {
            throw AlreadyBookedException("Already booked")
        }

        val confirmedCount = bookingRepository.countConfirmedByClassId(classId)
        if (confirmedCount >= classInstance.capacity.toLong()) {
            throw ClassFullException("Class is full")
        }

        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val booking = Booking(
            userId = targetUserId,
            classId = classId,
            status = BOOKING_STATUS_CONFIRMED,
            bookedAt = now,
            updatedAt = now
        )

        val saved = try {
            bookingRepository.save(booking)
        } catch (ex: DataIntegrityViolationException) {
            throw AlreadyBookedException("Already booked")
        }

        membershipToIncrement?.let {
            it.bookingsUsedThisMonth = it.bookingsUsedThisMonth + 1
        }

        val detailedClass = classInstanceRepository.findWithDetailsById(classId)
            ?: classInstance
        return saved.toResponse(detailedClass, now)
    }

    private fun validateBookableClass(classInstance: ClassInstance) {
        if (classInstance.type != "GROUP" || classInstance.status != "SCHEDULED") {
            throw ClassNotBookableException("Class is not bookable")
        }

        if (!classInstance.scheduledAt.isAfter(OffsetDateTime.now(ZoneOffset.UTC))) {
            throw ClassAlreadyStartedException("Class already started")
        }
    }

    private fun Booking.toResponse(classInstance: ClassInstance, now: OffsetDateTime): BookingResponse {
        val cutoffAt = classInstance.scheduledAt.minusHours(CANCELLATION_CUTOFF_HOURS)
        val trainerNames = classInstance.trainers
            .sortedWith(compareBy<Trainer>({ it.lastName.lowercase(Locale.ROOT) }, { it.firstName.lowercase(Locale.ROOT) }))
            .map { "${it.firstName} ${it.lastName}" }

        return BookingResponse(
            id = id,
            userId = userId,
            classId = classId,
            status = status,
            bookedAt = bookedAt,
            cancelledAt = cancelledAt,
            className = classInstance.name,
            scheduledAt = classInstance.scheduledAt,
            durationMin = classInstance.durationMin,
            trainerNames = trainerNames,
            classPhotoUrl = classInstance.template
                ?.takeIf { it.photoData != null }
                ?.let { "/api/v1/class-templates/${it.id}/photo" },
            isCancellable = status == BOOKING_STATUS_CONFIRMED && now.isBefore(cutoffAt),
            cancellationCutoffAt = cutoffAt
        )
    }

    private fun <T : RuntimeException> parseRequiredUuid(raw: String?, exceptionFactory: (String) -> T): UUID {
        val value = raw?.trim().orEmpty()
        if (value.isBlank()) {
            throw exceptionFactory("Missing UUID value")
        }

        return try {
            UUID.fromString(value)
        } catch (ex: IllegalArgumentException) {
            throw exceptionFactory("Invalid UUID value")
        }
    }

    private fun normalizeStatus(status: String): String {
        val normalized = status.trim().uppercase(Locale.ROOT)
        if (normalized !in BOOKING_STATUSES) {
            throw InvalidBookingStatusException("Invalid booking status '$status'")
        }
        return normalized
    }

    companion object {
        private const val CANCELLATION_CUTOFF_HOURS = 3L
        private const val BOOKING_STATUS_CONFIRMED = "CONFIRMED"
        private const val BOOKING_STATUS_CANCELLED = "CANCELLED"
        private val BOOKING_STATUSES = setOf("CONFIRMED", "CANCELLED", "ATTENDED")
    }
}

class InvalidClassIdException(message: String) : RuntimeException(message)
class InvalidUserIdException(message: String) : RuntimeException(message)
class InvalidBookingStatusException(message: String) : RuntimeException(message)
class ClassNotFoundException(message: String) : RuntimeException(message)
class ClassNotBookableException(message: String) : RuntimeException(message)
class ClassAlreadyStartedException(message: String) : RuntimeException(message)
class AlreadyBookedException(message: String) : RuntimeException(message)
class ClassFullException(message: String) : RuntimeException(message)
class BookingNotFoundException(message: String) : RuntimeException(message)
class BookingNotActiveException(message: String) : RuntimeException(message)
class CancellationWindowClosedException(message: String) : RuntimeException(message)
class UserNotFoundException(message: String) : RuntimeException(message)
