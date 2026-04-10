package com.gymflow.service

import com.gymflow.dto.TrainerDiscoveryResponse
import com.gymflow.dto.TrainerProfileResponse
import com.gymflow.exception.InvalidSortFieldException
import com.gymflow.exception.MembershipRequiredException
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.TrainerRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserTrainerFavoriteRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.DayOfWeek
import java.util.UUID

@Service
@Transactional(readOnly = true)
class TrainerDiscoveryService(
    private val trainerRepository: TrainerRepository,
    private val userTrainerFavoriteRepository: UserTrainerFavoriteRepository,
    private val userMembershipRepository: UserMembershipRepository,
    private val classInstanceRepository: ClassInstanceRepository
) {

    private val ALLOWED_SORT_FIELDS = setOf("lastName", "experienceYears")

    fun listTrainers(
        specializations: List<String>?,
        sort: String,
        pageable: Pageable,
        requestingUserId: UUID
    ): Page<TrainerDiscoveryResponse> {
        val lowerCaseSpecializations = specializations?.map { it.lowercase() }
        val useFilter = !lowerCaseSpecializations.isNullOrEmpty()
        val sortSpec = if (useFilter) {
            parseSortForNative(sort)
        } else {
            parseSortForEntity(sort)
        }

        val pageableWithCustomSort = PageRequest.of(pageable.pageNumber, pageable.pageSize, sortSpec)

        val trainersPage = if (useFilter) {
            trainerRepository.findBySpecializations(lowerCaseSpecializations, pageableWithCustomSort)
        } else {
            trainerRepository.findAllByDeletedAtIsNull(pageableWithCustomSort)
        }

        return mapTrainersToDiscoveryResponse(trainersPage, requestingUserId)
    }

    fun getFavoriteTrainers(
        sort: String,
        pageable: Pageable,
        requestingUserId: UUID
    ): Page<TrainerDiscoveryResponse> {
        requireActiveMembership(requestingUserId)
        val sortSpec = parseSortForEntity(sort)
        val pageableWithCustomSort = PageRequest.of(pageable.pageNumber, pageable.pageSize, sortSpec)

        val trainersPage = trainerRepository.findFavoritesByUserId(requestingUserId, pageableWithCustomSort)
        val trainerIds = trainersPage.content.map { it.id }.toSet()

        return mapTrainersToDiscoveryResponse(trainersPage, requestingUserId, trainerIds)
    }

    fun getTrainerProfile(
        trainerId: UUID,
        requestingUserId: UUID
    ): TrainerProfileResponse {
        val trainer = trainerRepository.findByIdAndDeletedAtIsNull(trainerId)
            ?: throw TrainerNotFoundException("Trainer with id '$trainerId' not found")

        val classCountMap = countScheduledClassesForTrainers(setOf(trainerId))
        val isFavorited = userTrainerFavoriteRepository.existsByUserIdAndTrainerId(requestingUserId, trainerId)
        val availabilityPreview = getAvailabilityPreview(trainerId)
        val profilePhotoUrl = resolveProfilePhotoUrl(trainer.id, trainer.profilePhotoUrl, trainer.photoData != null)

        return TrainerProfileResponse(
            id = trainer.id,
            firstName = trainer.firstName,
            lastName = trainer.lastName,
            profilePhotoUrl = profilePhotoUrl,
            bio = trainer.bio,
            specializations = trainer.specialisations,
            experienceYears = trainer.experienceYears,
            classCount = classCountMap[trainer.id] ?: 0,
            isFavorited = isFavorited,
            availabilityPreview = availabilityPreview
        )
    }

    private fun mapTrainersToDiscoveryResponse(
        trainersPage: Page<com.gymflow.domain.Trainer>,
        requestingUserId: UUID,
        favoritedTrainerIdsOverride: Set<UUID>? = null
    ): Page<TrainerDiscoveryResponse> {
        val trainerIds = trainersPage.content.map { it.id }
        val classCountMap = countScheduledClassesForTrainers(trainerIds.toSet())
        val favoritedTrainerIds = favoritedTrainerIdsOverride
            ?: userTrainerFavoriteRepository.findFavoritedTrainerIds(requestingUserId, trainerIds)

        val content = trainersPage.content.map { trainer ->
            val profilePhotoUrl = resolveProfilePhotoUrl(trainer.id, trainer.profilePhotoUrl, trainer.photoData != null)
            TrainerDiscoveryResponse(
                id = trainer.id,
                firstName = trainer.firstName,
                lastName = trainer.lastName,
                profilePhotoUrl = profilePhotoUrl,
                specializations = trainer.specialisations,
                experienceYears = trainer.experienceYears,
                classCount = classCountMap[trainer.id] ?: 0,
                isFavorited = favoritedTrainerIds.contains(trainer.id)
            )
        }
        return PageImpl(content, trainersPage.pageable, trainersPage.totalElements)
    }

    private fun countScheduledClassesForTrainers(trainerIds: Set<UUID>): Map<UUID, Int> {
        if (trainerIds.isEmpty()) return emptyMap()
        return classInstanceRepository.countScheduledClassesForTrainers(trainerIds)
            .associate { it[0] as UUID to (it[1] as Long).toInt() }
    }

    private fun getAvailabilityPreview(trainerId: UUID): Map<String, List<String>> {
        val dayHourPairs = classInstanceRepository.findScheduledDayHoursByTrainer(trainerId)

        val availabilityMap = mutableMapOf<DayOfWeek, MutableSet<String>>()

        dayHourPairs.forEach { pair ->
            val dowInt = (pair[0] as Number).toInt()
            val hourOfDay = (pair[1] as Number).toInt()

            val dayOfWeek = DayOfWeek.of(if (dowInt == 0) 7 else dowInt) // PostgreSQL DOW 0=Sunday, Java DOW 7=Sunday
            val timeBlock = when (hourOfDay) {
                in 6..11 -> "MORNING"
                in 12..16 -> "AFTERNOON"
                in 17..21 -> "EVENING"
                else -> null
            }
            if (timeBlock != null) {
                availabilityMap.getOrPut(dayOfWeek) { mutableSetOf() }.add(timeBlock)
            }
        }

        val fullAvailabilityMap = DayOfWeek.values().associate { day ->
            day.name to availabilityMap.getOrDefault(day, emptySet()).toList().sorted()
        }

        return fullAvailabilityMap
    }

    private fun resolveProfilePhotoUrl(trainerId: UUID, profilePhotoUrl: String?, hasPhotoData: Boolean): String? {
        return when {
            profilePhotoUrl != null -> profilePhotoUrl
            hasPhotoData -> "/api/v1/trainers/$trainerId/photo"
            else -> null
        }
    }

    fun validateSort(sortField: String) {
        if (sortField !in ALLOWED_SORT_FIELDS) throw InvalidSortFieldException(sortField)
    }

    private fun requireActiveMembership(userId: UUID) {
        if (!userMembershipRepository.existsByUserIdAndStatus(userId, "ACTIVE")) {
            throw MembershipRequiredException()
        }
    }

    private fun parseSortForEntity(sort: String): Sort {
        val parts = sort.split(",")
        if (parts.size != 2) throw InvalidSortFieldException(sort)
        val sortField = parts[0]
        val sortDir = parts[1]
        validateSort(sortField)
        val direction = when (sortDir.lowercase()) {
            "asc" -> Sort.Direction.ASC
            "desc" -> Sort.Direction.DESC
            else -> throw InvalidSortFieldException(sortField)
        }

        val order = when (sortField) {
            "experienceYears" -> Sort.Order(direction, "experienceYears").nullsLast()
            else -> Sort.Order(direction, sortField)
        }

        return Sort.by(order, Sort.Order.asc("id"))
    }

    private fun parseSortForNative(sort: String): Sort {
        val parts = sort.split(",")
        if (parts.size != 2) throw InvalidSortFieldException(sort)
        val sortField = parts[0]
        val sortDir = parts[1]
        validateSort(sortField)
        val direction = when (sortDir.lowercase()) {
            "asc" -> Sort.Direction.ASC
            "desc" -> Sort.Direction.DESC
            else -> throw InvalidSortFieldException(sortField)
        }

        val column = when (sortField) {
            "lastName" -> "last_name"
            "experienceYears" -> "experience_years"
            else -> sortField
        }

        val order = if (column == "experience_years") {
            Sort.Order(direction, column).nullsLast()
        } else {
            Sort.Order(direction, column)
        }

        return Sort.by(order, Sort.Order.asc("id"))
    }
}
