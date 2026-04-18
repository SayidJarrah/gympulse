package com.gymflow.service

import com.gymflow.domain.ClassInstance
import com.gymflow.domain.Trainer
import com.gymflow.dto.ActivityEventDto
import com.gymflow.dto.AuthedStatsResponse
import com.gymflow.dto.BookedStateResponse
import com.gymflow.dto.LandingActivityResponse
import com.gymflow.dto.LandingStatsResponse
import com.gymflow.dto.LandingViewerStateResponse
import com.gymflow.dto.LoggedOutStateResponse
import com.gymflow.dto.NextOpenClassDto
import com.gymflow.dto.NoBookedStateResponse
import com.gymflow.dto.PublicStatsResponse
import com.gymflow.dto.TightestClassDto
import com.gymflow.dto.TrainerRefDto
import com.gymflow.dto.UpcomingClassDto
import com.gymflow.repository.BookingRepository
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.TrainerRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserProfileRepository
import com.gymflow.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID
import kotlin.math.ceil

@Service
class LandingService(
    private val userRepository: UserRepository,
    private val userProfileRepository: UserProfileRepository,
    private val userMembershipRepository: UserMembershipRepository,
    private val classInstanceRepository: ClassInstanceRepository,
    private val bookingRepository: BookingRepository,
    private val trainerRepository: TrainerRepository,
    private val activityEventService: ActivityEventService
) {

    /**
     * Derives the landing-page viewer state for the given principal.
     * If [userId] is null the caller is unauthenticated — returns loggedOut.
     */
    @Transactional(readOnly = true)
    fun getViewerState(userId: UUID?): LandingViewerStateResponse {
        if (userId == null) return LoggedOutStateResponse()

        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val todayUtc = now.toLocalDate()

        // Compute onTheFloor: CONFIRMED or ATTENDED bookings whose class started
        // between 05:00 UTC today and now.
        val floorWindowStart = todayUtc.atTime(LocalTime.of(5, 0)).atOffset(ZoneOffset.UTC)
        val allTodayScheduledClasses = classInstanceRepository.findWithDetailsBetween(floorWindowStart, now)
        val floorClassIds = allTodayScheduledClasses.map { it.id }
        val onTheFloor = if (floorClassIds.isEmpty()) 0 else countOnFloor(floorClassIds)

        // Step 1: find CONFIRMED bookings for classes starting in [now, now+24h)
        val windowEnd = now.plusHours(24)
        val upcomingBookingClassIds = findUpcomingBookedClassIds(userId, now, windowEnd, todayUtc)

        if (upcomingBookingClassIds.isNotEmpty()) {
            // State: booked — use earliest class
            val classInstance = classInstanceRepository.findWithDetailsById(upcomingBookingClassIds.first())
                ?: return buildNoBookedResponse(userId, now, todayUtc, onTheFloor)

            val trainer = primaryTrainer(classInstance)
            val firstName = resolveFirstName(userId)

            return BookedStateResponse(
                firstName = firstName,
                onTheFloor = onTheFloor,
                upcomingClass = UpcomingClassDto(
                    id = classInstance.id,
                    name = classInstance.name,
                    startsAt = classInstance.scheduledAt,
                    trainer = trainer,
                    studio = classInstance.room?.name ?: "Studio",
                    durationMin = classInstance.durationMin
                )
            )
        }

        return buildNoBookedResponse(userId, now, todayUtc, onTheFloor)
    }

    /**
     * Returns live stats shaped for the landing page.
     * [authed] true => authed variant, false => public variant.
     */
    @Transactional(readOnly = true)
    fun getStats(authed: Boolean): LandingStatsResponse {
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val todayStart = now.toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC)
        val todayEnd = todayStart.plusDays(1)

        val classesToday = classInstanceRepository.findWithDetailsBetween(todayStart, todayEnd)
            .count { it.status == "SCHEDULED" && it.deletedAt == null }

        if (authed) {
            // onTheFloor: same as viewer-state logic
            val floorWindowStart = now.toLocalDate().atTime(LocalTime.of(5, 0)).atOffset(ZoneOffset.UTC)
            val floorClasses = classInstanceRepository.findWithDetailsBetween(floorWindowStart, now)
            val onTheFloor = if (floorClasses.isEmpty()) 0 else countOnFloor(floorClasses.map { it.id })

            // Tightest class: SCHEDULED after now today with lowest non-zero spotsLeft
            val remainingToday = classInstanceRepository.findWithDetailsBetween(now, todayEnd)
                .filter { it.status == "SCHEDULED" && it.deletedAt == null }

            val tightestClass = remainingToday
                .mapNotNull { ci ->
                    val confirmed = bookingRepository.countConfirmedByClassId(ci.id)
                    val spotsLeft = (ci.capacity - confirmed).toInt()
                    if (spotsLeft > 0) Pair(ci.name, spotsLeft) else null
                }
                .minByOrNull { it.second }
                ?.let { (name, spotsLeft) -> TightestClassDto(name = name, spotsLeft = spotsLeft) }

            return AuthedStatsResponse(
                onTheFloor = onTheFloor,
                classesToday = classesToday,
                tightestClass = tightestClass
            )
        }

        val memberCount = userMembershipRepository.findAllByStatus(
            "ACTIVE",
            org.springframework.data.domain.PageRequest.of(0, 1)
        ).totalElements
        val coachCount = trainerRepository.findAllByDeletedAtIsNull(
            org.springframework.data.domain.PageRequest.of(0, 1)
        ).totalElements

        return PublicStatsResponse(
            memberCount = memberCount,
            classesToday = classesToday,
            coachCount = coachCount
        )
    }

    /**
     * Returns the last 20 activity events shaped for authenticated or public viewers.
     */
    @Transactional(readOnly = true)
    fun getActivity(authed: Boolean): LandingActivityResponse {
        val events = activityEventService.getRecent()
        val dtos = events.map { event ->
            ActivityEventDto(
                id = event.id,
                kind = event.kind,
                actor = if (authed) event.actorName else "A member",
                text = if (authed) event.text else event.textPublic,
                at = event.occurredAt
            )
        }
        return LandingActivityResponse(
            variant = if (authed) "authed" else "public",
            events = dtos
        )
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private fun buildNoBookedResponse(
        userId: UUID,
        now: OffsetDateTime,
        todayUtc: LocalDate,
        onTheFloor: Int
    ): NoBookedStateResponse {
        val firstName = resolveFirstName(userId)
        val nextOpenClass = findNextOpenClass(now, todayUtc)

        return NoBookedStateResponse(
            firstName = firstName,
            onTheFloor = onTheFloor,
            nextOpenClass = nextOpenClass
        )
    }

    private fun findUpcomingBookedClassIds(
        userId: UUID,
        now: OffsetDateTime,
        windowEnd: OffsetDateTime,
        today: LocalDate
    ): List<UUID> {
        // Find CONFIRMED bookings for SCHEDULED classes starting in [now, windowEnd)
        val candidates = classInstanceRepository.findWithDetailsBetween(now, windowEnd)
            .filter { it.status == "SCHEDULED" && it.deletedAt == null }
            .sortedBy { it.scheduledAt }

        if (candidates.isEmpty()) return emptyList()

        val bookedClassIds = bookingRepository.findConfirmedByUserIdAndClassIds(userId, candidates.map { it.id })
            .map { it.classId }
            .toSet()

        return candidates.filter { it.id in bookedClassIds }.map { it.id }
    }

    private fun findNextOpenClass(
        now: OffsetDateTime,
        todayUtc: LocalDate
    ): NextOpenClassDto? {
        val lookAfter = now.plusMinutes(15)
        val todayEnd = todayUtc.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC)

        val candidates = classInstanceRepository.findWithDetailsBetween(lookAfter, todayEnd)
            .filter { it.status == "SCHEDULED" && it.deletedAt == null }
            .sortedBy { it.scheduledAt }

        val remainingClassesToday = candidates.size

        for (ci in candidates) {
            val confirmed = bookingRepository.countConfirmedByClassId(ci.id)
            val spotsLeft = (ci.capacity - confirmed).toInt()
            if (spotsLeft <= 0) continue

            val trainer = primaryTrainer(ci)
            val diffMillis = ci.scheduledAt.toInstant().toEpochMilli() - now.toInstant().toEpochMilli()
            val startsInMin = ceil(diffMillis / 60_000.0).toInt().coerceAtLeast(1)

            return NextOpenClassDto(
                id = ci.id,
                name = ci.name,
                startsIn = "$startsInMin min",
                startsAt = ci.scheduledAt,
                trainer = trainer,
                studio = ci.room?.name ?: "Studio",
                spotsLeft = spotsLeft,
                remainingClassesToday = remainingClassesToday
            )
        }

        return null
    }

    private fun countOnFloor(classIds: List<UUID>): Int {
        if (classIds.isEmpty()) return 0
        return bookingRepository.countConfirmedByClassIds(classIds)
            .sumOf { row -> (row[1] as Long).toInt() }
    }

    private fun primaryTrainer(ci: ClassInstance): TrainerRefDto {
        val trainer: Trainer? = ci.trainers.firstOrNull()
        return if (trainer != null) {
            TrainerRefDto(
                id = trainer.id,
                name = "${trainer.firstName} ${trainer.lastName}",
                avatarUrl = if (trainer.photoData != null) "/api/v1/trainers/${trainer.id}/photo" else null
            )
        } else {
            TrainerRefDto(id = null, name = "Staff", avatarUrl = null)
        }
    }

    private fun resolveFirstName(userId: UUID): String {
        val profile = userProfileRepository.findById(userId).orElse(null)
        return when {
            !profile?.firstName.isNullOrBlank() -> profile!!.firstName!!
            else -> {
                val user = userRepository.findById(userId).orElse(null)
                user?.email?.substringBefore("@") ?: "Member"
            }
        }
    }
}
