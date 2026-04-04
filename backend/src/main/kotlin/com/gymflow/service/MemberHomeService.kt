package com.gymflow.service

import com.gymflow.domain.Trainer
import com.gymflow.dto.MemberHomeClassPreviewItemResponse
import com.gymflow.dto.MemberHomeClassPreviewResponse
import com.gymflow.exception.MemberHomeInvalidTimeZoneException
import com.gymflow.repository.ClassInstanceRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.util.Locale

@Service
class MemberHomeService(
    private val classInstanceRepository: ClassInstanceRepository
) {

    @Transactional(readOnly = true)
    fun getUpcomingClassesPreview(timeZone: String?): MemberHomeClassPreviewResponse {
        val zoneId = parseTimeZone(timeZone)
        val rangeStartDate = LocalDate.now(zoneId)
        val rangeEndDateExclusive = rangeStartDate.plusDays(PREVIEW_WINDOW_DAYS)
        val rangeEndUtcExclusive = rangeEndDateExclusive.atStartOfDay(zoneId)
            .toOffsetDateTime()
            .withOffsetSameInstant(ZoneOffset.UTC)

        val previewIds = classInstanceRepository.findUpcomingGroupPreviewIds(rangeEndUtcExclusive)
        if (previewIds.isEmpty()) {
            return MemberHomeClassPreviewResponse(
                timeZone = zoneId.id,
                rangeStartDate = rangeStartDate,
                rangeEndDateExclusive = rangeEndDateExclusive,
                entries = emptyList()
            )
        }

        val previewIdOrder = previewIds.withIndex().associate { it.value to it.index }
        val entries = classInstanceRepository.findPreviewDetailsByIds(previewIds)
            .sortedWith(compareBy({ it.scheduledAt }, { previewIdOrder[it.id] ?: Int.MAX_VALUE }))
            .take(MAX_PREVIEW_SIZE)
            .map { instance ->
                MemberHomeClassPreviewItemResponse(
                    id = instance.id,
                    name = instance.name,
                    scheduledAt = instance.scheduledAt,
                    localDate = instance.scheduledAt.atZoneSameInstant(zoneId).toLocalDate(),
                    durationMin = instance.durationMin,
                    trainerDisplayName = formatTrainerDisplayName(instance.trainers.toList()),
                    classPhotoUrl = instance.template
                        ?.takeIf { it.photoData != null }
                        ?.let { "/api/v1/class-templates/${it.id}/photo" }
                )
            }

        return MemberHomeClassPreviewResponse(
            timeZone = zoneId.id,
            rangeStartDate = rangeStartDate,
            rangeEndDateExclusive = rangeEndDateExclusive,
            entries = entries
        )
    }

    private fun parseTimeZone(timeZone: String?): ZoneId {
        if (timeZone.isNullOrBlank()) {
            throw MemberHomeInvalidTimeZoneException("timeZone is required")
        }

        return try {
            ZoneId.of(timeZone)
        } catch (ex: Exception) {
            throw MemberHomeInvalidTimeZoneException("Invalid timeZone '$timeZone'")
        }
    }

    private fun formatTrainerDisplayName(trainers: List<Trainer>): String {
        if (trainers.isEmpty()) {
            return TRAINER_TBA
        }

        val sortedNames = trainers
            .sortedWith(compareBy({ it.lastName.lowercase(Locale.ROOT) }, { it.firstName.lowercase(Locale.ROOT) }))
            .map { "${it.firstName} ${it.lastName}" }

        return if (sortedNames.size == 1) {
            sortedNames.first()
        } else {
            "${sortedNames.first()} +${sortedNames.size - 1}"
        }
    }

    companion object {
        private const val MAX_PREVIEW_SIZE = 8
        private const val PREVIEW_WINDOW_DAYS = 14L
        private const val TRAINER_TBA = "Trainer TBA"
    }
}
