package com.gymflow.service

import com.gymflow.domain.Trainer
import com.gymflow.dto.ScheduleEntryBookingSummaryResponse
import com.gymflow.dto.UserClassScheduleEntryResponse
import com.gymflow.dto.UserClassScheduleResponse
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.UserMembershipRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.time.temporal.WeekFields
import java.util.Locale
import java.util.UUID

@Service
class UserClassScheduleService(
    private val classInstanceRepository: ClassInstanceRepository,
    private val userMembershipRepository: UserMembershipRepository,
    private val bookingService: BookingService
) {

    @Transactional(readOnly = true)
    fun getSchedule(
        userId: UUID,
        view: String?,
        anchorDate: String?,
        timeZone: String?
    ): UserClassScheduleResponse {
        val scheduleView = parseView(view)
        val anchor = parseAnchorDate(anchorDate)
        val zoneId = parseTimeZone(timeZone)

        val today = LocalDate.now(ZoneOffset.UTC)
        val hasActiveMembership = userMembershipRepository.findAccessibleActiveMembership(userId, today) != null

        val week = formatWeek(anchor)
        val range = buildRange(scheduleView, anchor)
        val startUtc = range.start.atStartOfDay(zoneId)
            .toOffsetDateTime()
            .withOffsetSameInstant(ZoneOffset.UTC)
        val endUtc = range.end.atStartOfDay(zoneId)
            .toOffsetDateTime()
            .withOffsetSameInstant(ZoneOffset.UTC)

        val instances = classInstanceRepository.findVisibleGroupScheduleBetween(startUtc, endUtc)
        val confirmedCounts = bookingService.countConfirmedBookings(instances.map { it.id })
        val currentUserBookings = bookingService.findConfirmedBookingsByUserAndClassIds(userId, instances.map { it.id })
        val now = java.time.OffsetDateTime.now(ZoneOffset.UTC)
        val entries = instances
            .filter { it.deletedAt == null && it.type == "GROUP" && it.status == "SCHEDULED" }
            .sortedBy { it.scheduledAt }
            .map { instance ->
                val localDate = instance.scheduledAt.atZoneSameInstant(zoneId).toLocalDate()
                val trainerNames = instance.trainers
                    .sortedWith(compareBy<Trainer>({ it.lastName.lowercase(Locale.ROOT) }, { it.firstName.lowercase(Locale.ROOT) }))
                    .map { "${it.firstName} ${it.lastName}" }
                val confirmedBookings = confirmedCounts[instance.id] ?: 0L
                val remainingSpots = (instance.capacity.toLong() - confirmedBookings).coerceAtLeast(0).toInt()
                val currentUserBooking = currentUserBookings[instance.id]
                val cancellationAllowed = currentUserBooking != null &&
                    now.isBefore(instance.scheduledAt.minusHours(3))
                val bookingDeniedReason = when {
                    currentUserBooking != null -> "ALREADY_BOOKED"
                    !instance.scheduledAt.isAfter(now) -> "CLASS_ALREADY_STARTED"
                    confirmedBookings >= instance.capacity.toLong() -> "CLASS_FULL"
                    !hasActiveMembership -> "MEMBERSHIP_REQUIRED"
                    else -> null
                }

                UserClassScheduleEntryResponse(
                    id = instance.id,
                    name = instance.name,
                    scheduledAt = instance.scheduledAt,
                    localDate = localDate,
                    durationMin = instance.durationMin,
                    trainerNames = trainerNames,
                    classPhotoUrl = instance.template
                        ?.takeIf { it.photoData != null }
                        ?.let { "/api/v1/class-templates/${it.id}/photo" },
                    capacity = instance.capacity,
                    confirmedBookings = confirmedBookings,
                    remainingSpots = remainingSpots,
                    currentUserBooking = currentUserBooking?.let {
                        ScheduleEntryBookingSummaryResponse(
                            id = it.id,
                            status = it.status,
                            bookedAt = it.bookedAt
                        )
                    },
                    bookingAllowed = bookingDeniedReason == null,
                    bookingDeniedReason = bookingDeniedReason,
                    cancellationAllowed = cancellationAllowed
                )
            }

        return UserClassScheduleResponse(
            view = scheduleView.value,
            anchorDate = anchor,
            timeZone = zoneId.id,
            week = week,
            rangeStartDate = range.start,
            rangeEndDateExclusive = range.end,
            hasActiveMembership = hasActiveMembership,
            entries = entries
        )
    }

    private fun parseView(view: String?): ScheduleView {
        val raw = view?.lowercase(Locale.ROOT) ?: throw InvalidScheduleViewException("view is required")
        return ScheduleView.entries.firstOrNull { it.value == raw }
            ?: throw InvalidScheduleViewException("Invalid schedule view '$raw'")
    }

    private fun parseAnchorDate(anchorDate: String?): LocalDate {
        if (anchorDate.isNullOrBlank()) {
            throw InvalidAnchorDateException("anchorDate is required")
        }
        return try {
            LocalDate.parse(anchorDate, DateTimeFormatter.ISO_LOCAL_DATE)
        } catch (ex: Exception) {
            throw InvalidAnchorDateException("Invalid anchorDate '$anchorDate'")
        }
    }

    private fun parseTimeZone(timeZone: String?): ZoneId {
        if (timeZone.isNullOrBlank()) {
            throw InvalidTimeZoneException("timeZone is required")
        }
        return try {
            ZoneId.of(timeZone)
        } catch (ex: Exception) {
            throw InvalidTimeZoneException("Invalid timeZone '$timeZone'")
        }
    }

    private fun buildRange(view: ScheduleView, anchor: LocalDate): DateRange {
        return when (view) {
            ScheduleView.WEEK -> {
                val weekStart = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                DateRange(weekStart, weekStart.plusDays(7))
            }
            ScheduleView.DAY -> DateRange(anchor, anchor.plusDays(1))
            ScheduleView.LIST -> DateRange(anchor, anchor.plusDays(14))
        }
    }

    private fun formatWeek(anchor: LocalDate): String {
        val weekFields = WeekFields.ISO
        val week = anchor.get(weekFields.weekOfWeekBasedYear())
        val year = anchor.get(weekFields.weekBasedYear())
        return String.format("%d-W%02d", year, week)
    }

    private data class DateRange(
        val start: LocalDate,
        val end: LocalDate
    )

    private enum class ScheduleView(val value: String) {
        WEEK("week"),
        DAY("day"),
        LIST("list")
    }
}

class InvalidScheduleViewException(message: String) : RuntimeException(message)
class InvalidAnchorDateException(message: String) : RuntimeException(message)
class InvalidTimeZoneException(message: String) : RuntimeException(message)
