package com.gymflow.service

import com.gymflow.domain.PtBooking
import com.gymflow.domain.PtBooking.Companion.PT_STATUS_CANCELLED
import com.gymflow.domain.PtBooking.Companion.PT_STATUS_CONFIRMED
import com.gymflow.dto.AdminPtSessionResponse
import com.gymflow.dto.AdminPtStatsResponse
import com.gymflow.dto.DayAvailability
import com.gymflow.dto.PtBookingRequest
import com.gymflow.dto.PtBookingResponse
import com.gymflow.dto.PtTrainerSummaryResponse
import com.gymflow.dto.TrainerAvailabilityResponse
import com.gymflow.dto.TrainerScheduleResponse
import com.gymflow.dto.TrainerSessionClassResponse
import com.gymflow.dto.TrainerSessionStats
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.PtBookingRepository
import com.gymflow.repository.TrainerRepository
import com.gymflow.repository.UserProfileRepository
import com.gymflow.repository.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@Service
class PtBookingService(
    private val ptBookingRepository: PtBookingRepository,
    private val trainerRepository: TrainerRepository,
    private val classInstanceRepository: ClassInstanceRepository,
    private val userRepository: UserRepository,
    private val userProfileRepository: UserProfileRepository,
    @Value("\${gymflow.pt.gym-open-hour:6}") private val gymOpenHour: Int,
    @Value("\${gymflow.pt.gym-close-hour:22}") private val gymCloseHour: Int,
    @Value("\${gymflow.pt.lead-time-hours:24}") private val leadTimeHours: Long
) {

    // ─── Member: Trainer directory ────────────────────────────────────────────

    @Transactional(readOnly = true)
    fun listPtTrainers(specialties: List<String>?, pageable: Pageable): Page<PtTrainerSummaryResponse> {
        val lowerSpecs = specialties?.map { it.lowercase() }
        val trainersPage = if (!lowerSpecs.isNullOrEmpty()) {
            trainerRepository.findBySpecializations(lowerSpecs, pageable)
        } else {
            trainerRepository.findAllByDeletedAtIsNull(pageable)
        }

        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val weekEnd = now.plusDays(7)
        val twoWeekEnd = now.plusDays(14)

        val content = trainersPage.content.map { trainer ->
            val weekBookings = ptBookingRepository.findConfirmedByTrainerInWindow(trainer.id, now, weekEnd)
            val twoWeekBookings = ptBookingRepository.findConfirmedByTrainerInWindow(trainer.id, now, twoWeekEnd)
            val trainerClasses = classInstanceRepository.findTrainerOverlaps(trainer.id, now, twoWeekEnd)
            val sessionsCompleted = ptBookingRepository.countConfirmedByTrainer(trainer.id).toInt()

            val (nextOpenAt, weekOpenCount) = computeOpenStats(
                trainerId = trainer.id,
                now = now,
                weekEnd = weekEnd,
                twoWeekEnd = twoWeekEnd,
                ptBookingsWeek = weekBookings,
                ptBookingsTwoWeek = twoWeekBookings,
                groupClasses = trainerClasses
            )
            val profilePhotoUrl = resolveTrainerPhotoUrl(trainer)

            PtTrainerSummaryResponse(
                id = trainer.id,
                firstName = trainer.firstName,
                lastName = trainer.lastName,
                profilePhotoUrl = profilePhotoUrl,
                bio = trainer.bio,
                specializations = trainer.specialisations,
                experienceYears = trainer.experienceYears,
                sessionsCompleted = sessionsCompleted,
                accentColor = trainer.accentColor,
                defaultRoom = trainer.defaultRoom,
                nextOpenAt = nextOpenAt,
                weekOpenCount = weekOpenCount
            )
        }

        return PageImpl(content, trainersPage.pageable, trainersPage.totalElements)
    }

    // ─── Member: Availability ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    fun getAvailability(trainerId: UUID, start: LocalDate, end: LocalDate): TrainerAvailabilityResponse {
        trainerRepository.findByIdAndDeletedAtIsNull(trainerId)
            ?: throw TrainerNotFoundException("Trainer not found: $trainerId")

        val windowStart = start.atStartOfDay().atOffset(ZoneOffset.UTC)
        val windowEnd = end.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC)

        val ptBookings = ptBookingRepository.findConfirmedByTrainerInWindow(trainerId, windowStart, windowEnd)
        val groupClasses = classInstanceRepository.findTrainerOverlaps(trainerId, windowStart, windowEnd)
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val cutoff = now.plusHours(leadTimeHours)

        val days = generateSequence(start) { if (it < end) it.plusDays(1) else null }
            .toList()
            .map { date ->
                val slots = (gymOpenHour until gymCloseHour).associate { hour ->
                    val slotStart = date.atTime(LocalTime.of(hour, 0)).atOffset(ZoneOffset.UTC)
                    val slotEnd = slotStart.plusHours(1)
                    val status = computeSlotStatus(slotStart, slotEnd, cutoff, ptBookings, groupClasses)
                    hour to status
                }
                DayAvailability(date = date, open = gymOpenHour, close = gymCloseHour, slots = slots)
            }

        return TrainerAvailabilityResponse(trainerId = trainerId, days = days)
    }

    // ─── Member: Create booking ───────────────────────────────────────────────

    @Transactional
    fun createBooking(memberId: UUID, request: PtBookingRequest): PtBookingResponse {
        val trainerId = request.trainerId ?: throw PtTrainerNotFoundException("Trainer ID required")
        val startAt = request.startAt ?: throw PtInvalidStartException("Start time required")

        val trainer = trainerRepository.findByIdAndDeletedAtIsNull(trainerId)
            ?: throw TrainerNotFoundException("Trainer not found: $trainerId")

        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val cutoff = now.plusHours(leadTimeHours)

        // 24h lead time
        if (startAt.isBefore(cutoff)) {
            throw PtLeadTimeViolationException("Booking must be at least $leadTimeHours hours in advance")
        }

        // Must be on a whole hour within gym hours
        if (startAt.minute != 0 || startAt.second != 0 || startAt.nano != 0) {
            throw PtOutsideGymHoursException("Start time must be on the hour")
        }
        val hour = startAt.hour
        if (hour < gymOpenHour || hour >= gymCloseHour) {
            throw PtOutsideGymHoursException("Start time is outside gym hours")
        }

        val endAt = startAt.plusHours(1)

        // Check no overlapping PT booking
        val ptOverlap = ptBookingRepository.countTrainerOverlap(trainerId, startAt, endAt)
        if (ptOverlap > 0) {
            throw PtTrainerOverlapException("Trainer already has a PT booking at this time")
        }

        // Check no overlapping group class
        val classOverlaps = classInstanceRepository.findTrainerOverlaps(trainerId, startAt, endAt)
        if (classOverlaps.isNotEmpty()) {
            throw PtTrainerClassOverlapException("Trainer has a class at this time")
        }

        val room = trainer.defaultRoom ?: ""
        val booking = ptBookingRepository.save(
            PtBooking(
                trainerId = trainerId,
                memberId = memberId,
                startAt = startAt,
                endAt = endAt,
                room = room,
                status = PT_STATUS_CONFIRMED
            )
        )

        val memberProfile = userProfileRepository.findById(memberId).orElse(null)
        val memberName = buildDisplayName(memberProfile?.firstName, memberProfile?.lastName)

        return booking.toResponse(
            trainerName = "${trainer.firstName} ${trainer.lastName}",
            trainerAccentColor = trainer.accentColor,
            trainerPhotoUrl = resolveTrainerPhotoUrl(trainer),
            memberName = memberName
        )
    }

    // ─── Member: Cancel booking ───────────────────────────────────────────────

    @Transactional
    fun cancelBooking(memberId: UUID, bookingId: UUID): PtBookingResponse {
        val booking = ptBookingRepository.findByIdAndMemberId(bookingId, memberId)
            ?: throw PtBookingNotFoundException("PT booking not found")

        if (booking.status != PT_STATUS_CONFIRMED) {
            throw PtBookingNotActiveException("PT booking is not active")
        }

        val now = OffsetDateTime.now(ZoneOffset.UTC)
        booking.status = PT_STATUS_CANCELLED
        booking.cancelledAt = now
        val saved = ptBookingRepository.save(booking)

        val trainer = trainerRepository.findByIdAndDeletedAtIsNull(booking.trainerId)
        val trainerName = trainer?.let { "${it.firstName} ${it.lastName}" } ?: "Unknown Trainer"
        val memberProfile = userProfileRepository.findById(memberId).orElse(null)
        val memberName = buildDisplayName(memberProfile?.firstName, memberProfile?.lastName)

        return saved.toResponse(
            trainerName = trainerName,
            trainerAccentColor = trainer?.accentColor,
            trainerPhotoUrl = trainer?.let { resolveTrainerPhotoUrl(it) },
            memberName = memberName
        )
    }

    // ─── Member: My PT bookings ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    fun getMyBookings(memberId: UUID, status: String?, pageable: Pageable): Page<PtBookingResponse> {
        val normalizedStatus = status?.trim()?.uppercase()?.takeIf { it in setOf("CONFIRMED", "CANCELLED") }
        val page = ptBookingRepository.findByMemberIdAndStatus(memberId, normalizedStatus, pageable)

        val trainerIds = page.content.map { it.trainerId }.distinct()
        val trainers = trainerRepository.findAllById(trainerIds).associateBy { it.id }
        val memberProfile = userProfileRepository.findById(memberId).orElse(null)
        val memberName = buildDisplayName(memberProfile?.firstName, memberProfile?.lastName)

        val content = page.content.map { booking ->
            val trainer = trainers[booking.trainerId]
            booking.toResponse(
                trainerName = trainer?.let { "${it.firstName} ${it.lastName}" } ?: "Unknown Trainer",
                trainerAccentColor = trainer?.accentColor,
                trainerPhotoUrl = trainer?.let { resolveTrainerPhotoUrl(it) },
                memberName = memberName
            )
        }

        return PageImpl(content, page.pageable, page.totalElements)
    }

    // ─── Trainer: Session schedule ────────────────────────────────────────────

    @Transactional(readOnly = true)
    fun getTrainerSchedule(trainerId: UUID, start: LocalDate, end: LocalDate): TrainerScheduleResponse {
        val trainer = trainerRepository.findByIdAndDeletedAtIsNull(trainerId)
            ?: throw TrainerNotFoundException("Trainer not found: $trainerId")

        val windowStart = start.atStartOfDay().atOffset(ZoneOffset.UTC)
        val windowEnd = end.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC)

        val ptSessions = ptBookingRepository.findConfirmedByTrainerInRange(trainerId, windowStart, windowEnd)
        val groupClasses = classInstanceRepository.findTrainerOverlaps(trainerId, windowStart, windowEnd)
            .filter { it.status == "SCHEDULED" && it.deletedAt == null }

        val memberIds = ptSessions.map { it.memberId }.distinct()
        val memberProfiles = userProfileRepository.findAllById(memberIds).associateBy { it.userId }
        val memberUsers = userRepository.findAllById(memberIds).associateBy { it.id }

        val ptResponses = ptSessions.map { booking ->
            val profile = memberProfiles[booking.memberId]
            val user = memberUsers[booking.memberId]
            val memberName = buildDisplayName(profile?.firstName, profile?.lastName)
                .ifBlank { user?.email?.substringBefore("@") ?: "Member" }
            booking.toResponse(
                trainerName = "${trainer.firstName} ${trainer.lastName}",
                trainerAccentColor = trainer.accentColor,
                trainerPhotoUrl = resolveTrainerPhotoUrl(trainer),
                memberName = memberName
            )
        }

        val classResponses = groupClasses.map { ci ->
            TrainerSessionClassResponse(
                id = ci.id,
                name = ci.name,
                scheduledAt = ci.scheduledAt,
                durationMin = ci.durationMin,
                room = ci.room?.name,
                type = "class"
            )
        }

        return TrainerScheduleResponse(
            trainerId = trainerId,
            trainerName = "${trainer.firstName} ${trainer.lastName}",
            ptSessions = ptResponses,
            groupClasses = classResponses,
            stats = TrainerSessionStats(
                ptCount = ptResponses.size,
                classCount = classResponses.size,
                total = ptResponses.size + classResponses.size
            )
        )
    }

    // ─── Admin: PT sessions ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    fun getAdminSessions(
        trainerId: UUID?,
        status: String?,
        windowStart: OffsetDateTime?,
        windowEnd: OffsetDateTime?,
        q: String?,
        pageable: Pageable
    ): Page<AdminPtSessionResponse> {
        val normalizedStatus = status?.trim()?.uppercase()?.takeIf { it in setOf("CONFIRMED", "CANCELLED") }
        val page = ptBookingRepository.findAdminSessions(trainerId, normalizedStatus, windowStart, windowEnd, pageable)

        val trainerIds = page.content.map { it.trainerId }.distinct()
        val memberIds = page.content.map { it.memberId }.distinct()
        val trainers = trainerRepository.findAllById(trainerIds).associateBy { it.id }
        val memberProfiles = userProfileRepository.findAllById(memberIds).associateBy { it.userId }
        val memberUsers = userRepository.findAllById(memberIds).associateBy { it.id }

        var content = page.content.map { booking ->
            val trainer = trainers[booking.trainerId]
            val profile = memberProfiles[booking.memberId]
            val user = memberUsers[booking.memberId]
            val memberName = buildDisplayName(profile?.firstName, profile?.lastName)
                .ifBlank { user?.email?.substringBefore("@") ?: "Member" }

            AdminPtSessionResponse(
                id = booking.id,
                trainerId = booking.trainerId,
                trainerName = trainer?.let { "${it.firstName} ${it.lastName}" } ?: "Unknown Trainer",
                trainerAccentColor = trainer?.accentColor,
                memberId = booking.memberId,
                memberName = memberName,
                startAt = booking.startAt,
                endAt = booking.endAt,
                room = booking.room,
                status = booking.status,
                cancelledAt = booking.cancelledAt,
                createdAt = booking.createdAt
            )
        }

        // Full-text search (post-filter in application layer — acceptable for this dataset size)
        if (!q.isNullOrBlank()) {
            val lower = q.lowercase()
            content = content.filter { session ->
                session.trainerName.lowercase().contains(lower) ||
                session.memberName.lowercase().contains(lower) ||
                session.room.lowercase().contains(lower) ||
                session.startAt.toString().contains(lower)
            }
        }

        return PageImpl(content, page.pageable, page.totalElements)
    }

    @Transactional(readOnly = true)
    fun getAdminStats(): AdminPtStatsResponse {
        return AdminPtStatsResponse(
            activeCount = ptBookingRepository.countActive(),
            uniqueMembers = ptBookingRepository.countUniqueMembers(),
            uniqueTrainers = ptBookingRepository.countUniqueTrainers(),
            cancelledCount = ptBookingRepository.countCancelled()
        )
    }

    @Transactional(readOnly = true)
    fun exportAdminSessionsCsv(
        trainerId: UUID?,
        status: String?,
        windowStart: OffsetDateTime?,
        windowEnd: OffsetDateTime?,
        q: String?
    ): String {
        val allSessions = getAdminSessions(
            trainerId, status, windowStart, windowEnd, q,
            org.springframework.data.domain.PageRequest.of(0, Int.MAX_VALUE)
        )

        val sb = StringBuilder()
        sb.appendLine("when,trainer,member,room,status,booked_at")
        allSessions.content.forEach { session ->
            sb.appendLine("${session.startAt},\"${session.trainerName}\",\"${session.memberName}\",\"${session.room}\",${session.status},${session.createdAt}")
        }
        return sb.toString()
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private fun computeSlotStatus(
        slotStart: OffsetDateTime,
        slotEnd: OffsetDateTime,
        cutoff: OffsetDateTime,
        ptBookings: List<PtBooking>,
        groupClasses: List<com.gymflow.domain.ClassInstance>
    ): String {
        if (slotStart.isBefore(cutoff)) return SLOT_PAST
        val hasClass = groupClasses.any { ci ->
            val ciEnd = ci.scheduledAt.plusMinutes(ci.durationMin.toLong())
            ci.scheduledAt < slotEnd && ciEnd > slotStart
        }
        if (hasClass) return SLOT_CLASS
        val hasBooking = ptBookings.any { b -> b.startAt < slotEnd && b.endAt > slotStart }
        if (hasBooking) return SLOT_BOOKED
        return SLOT_AVAILABLE
    }

    private fun computeOpenStats(
        @Suppress("UNUSED_PARAMETER") trainerId: UUID,
        now: OffsetDateTime,
        weekEnd: OffsetDateTime,
        @Suppress("UNUSED_PARAMETER") twoWeekEnd: OffsetDateTime,
        @Suppress("UNUSED_PARAMETER") ptBookingsWeek: List<PtBooking>,
        ptBookingsTwoWeek: List<PtBooking>,
        groupClasses: List<com.gymflow.domain.ClassInstance>
    ): Pair<OffsetDateTime?, Int> {
        val cutoff = now.plusHours(leadTimeHours)
        var nextOpenAt: OffsetDateTime? = null
        var weekOpenCount = 0

        val today = now.toLocalDate()
        val endDate = today.plusDays(14)
        val groupClassesTwoWeek = groupClasses.filter { it.status == "SCHEDULED" && it.deletedAt == null }

        generateSequence(today) { if (it < endDate) it.plusDays(1) else null }.forEach { date ->
            val isInWeek = !date.atStartOfDay().atOffset(ZoneOffset.UTC).isAfter(weekEnd)
            (gymOpenHour until gymCloseHour).forEach { hour ->
                val slotStart = date.atTime(LocalTime.of(hour, 0)).atOffset(ZoneOffset.UTC)
                val slotEnd = slotStart.plusHours(1)
                val status = computeSlotStatus(slotStart, slotEnd, cutoff, ptBookingsTwoWeek, groupClassesTwoWeek)
                if (status == SLOT_AVAILABLE) {
                    if (nextOpenAt == null) nextOpenAt = slotStart
                    if (isInWeek) weekOpenCount++
                }
            }
        }

        return Pair(nextOpenAt, weekOpenCount)
    }

    private fun PtBooking.toResponse(
        trainerName: String,
        trainerAccentColor: String?,
        trainerPhotoUrl: String?,
        memberName: String
    ): PtBookingResponse {
        return PtBookingResponse(
            id = id,
            trainerId = trainerId,
            trainerName = trainerName,
            trainerAccentColor = trainerAccentColor,
            trainerPhotoUrl = trainerPhotoUrl,
            memberId = memberId,
            memberName = memberName,
            startAt = startAt,
            endAt = endAt,
            room = room,
            note = note,
            status = status,
            cancelledAt = cancelledAt,
            createdAt = createdAt
        )
    }

    private fun resolveTrainerPhotoUrl(trainer: com.gymflow.domain.Trainer): String? {
        return when {
            trainer.profilePhotoUrl != null -> trainer.profilePhotoUrl
            trainer.photoData != null -> "/api/v1/trainers/${trainer.id}/photo"
            else -> null
        }
    }

    private fun buildDisplayName(firstName: String?, lastName: String?): String {
        val first = firstName?.trim()
        val last = lastName?.trim()
        return when {
            !first.isNullOrBlank() && !last.isNullOrBlank() -> "$first $last"
            !first.isNullOrBlank() -> first
            !last.isNullOrBlank() -> last
            else -> ""
        }
    }

    companion object {
        private const val SLOT_AVAILABLE = "available"
        private const val SLOT_CLASS = "class"
        private const val SLOT_BOOKED = "booked"
        private const val SLOT_PAST = "past"
    }
}

// ─── Custom exceptions ────────────────────────────────────────────────────────

class PtLeadTimeViolationException(message: String) : RuntimeException(message)
class PtTrainerOverlapException(message: String) : RuntimeException(message)
class PtTrainerClassOverlapException(message: String) : RuntimeException(message)
class PtOutsideGymHoursException(message: String) : RuntimeException(message)
class PtBookingNotFoundException(message: String) : RuntimeException(message)
class PtBookingNotActiveException(message: String) : RuntimeException(message)
class PtTrainerNotFoundException(message: String) : RuntimeException(message)
class PtInvalidStartException(message: String) : RuntimeException(message)
