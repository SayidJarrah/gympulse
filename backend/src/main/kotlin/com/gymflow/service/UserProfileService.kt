package com.gymflow.service

import com.gymflow.domain.User
import com.gymflow.domain.UserProfile
import com.gymflow.dto.EmergencyContactDto
import com.gymflow.dto.EmergencyContactInput
import com.gymflow.dto.UpdateUserProfileRequest
import com.gymflow.dto.UserProfileResponse
import com.gymflow.repository.UserProfileRepository
import com.gymflow.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.LinkedHashSet
import java.util.Locale
import java.util.UUID

@Service
class UserProfileService(
    private val userProfileRepository: UserProfileRepository,
    private val userRepository: UserRepository,
    private val photoValidationService: PhotoValidationService
) {

    @Transactional(readOnly = true)
    fun getMyProfile(userId: UUID): UserProfileResponse {
        val user = loadUser(userId)
        val profile = userProfileRepository.findById(userId).orElse(null)
        return toResponse(user, profile)
    }

    @Transactional
    fun updateMyProfile(userId: UUID, request: UpdateUserProfileRequest): UserProfileResponse {
        val user = loadUser(userId)

        validateReadOnlyFields(request)

        val firstName = normalizeOptionalName(request.firstName) { InvalidFirstNameException("First name is invalid") }
        val lastName = normalizeOptionalName(request.lastName) { InvalidLastNameException("Last name is invalid") }
        val phone = normalizePhone(request.phone)
        val dateOfBirth = parseDateOfBirth(request.dateOfBirth)
        val fitnessGoals = normalizeOrderedList(request.fitnessGoals) {
            InvalidFitnessGoalsException("Fitness goals are invalid")
        }
        val preferredClassTypes = normalizeOrderedList(request.preferredClassTypes) {
            InvalidPreferredClassTypesException("Preferred class types are invalid")
        }
        val (ecName, ecPhone) = validateEmergencyContact(request.emergencyContact)

        val profile = userProfileRepository.findById(userId).orElse(
            UserProfile(userId = userId)
        )

        profile.firstName = firstName
        profile.lastName = lastName
        profile.phone = phone
        profile.dateOfBirth = dateOfBirth
        profile.fitnessGoals = fitnessGoals.toMutableList()
        profile.preferredClassTypes = preferredClassTypes.toMutableList()
        profile.emergencyContactName = ecName
        profile.emergencyContactPhone = ecPhone

        val saved = userProfileRepository.save(profile)
        return toResponse(user, saved)
    }

    @Transactional
    fun uploadMyProfilePhoto(userId: UUID, file: MultipartFile) {
        loadUser(userId)
        val validated = photoValidationService.validatePhoto(file)
        val profile = userProfileRepository.findById(userId).orElse(UserProfile(userId = userId))

        profile.profilePhotoData = validated.bytes
        profile.profilePhotoMimeType = validated.mimeType

        userProfileRepository.save(profile)
    }

    @Transactional(readOnly = true)
    fun getMyProfilePhoto(userId: UUID): UserProfilePhoto {
        loadUser(userId)
        val profile = userProfileRepository.findById(userId).orElseThrow {
            ImageNotFoundException("Profile photo not found")
        }
        val photoData = profile.profilePhotoData ?: throw ImageNotFoundException("Profile photo not found")
        val mimeType = profile.profilePhotoMimeType ?: throw ImageNotFoundException("Profile photo not found")

        return UserProfilePhoto(
            data = photoData,
            mimeType = mimeType,
            updatedAt = profile.updatedAt
        )
    }

    @Transactional(readOnly = true)
    fun getProfilePhotoForAdmin(userId: UUID): UserProfilePhoto {
        val profile = userProfileRepository.findById(userId).orElseThrow {
            ImageNotFoundException("Profile photo not found")
        }
        val photoData = profile.profilePhotoData ?: throw ImageNotFoundException("Profile photo not found")
        val mimeType = profile.profilePhotoMimeType ?: throw ImageNotFoundException("Profile photo not found")

        return UserProfilePhoto(
            data = photoData,
            mimeType = mimeType,
            updatedAt = profile.updatedAt
        )
    }

    @Transactional
    fun deleteMyProfilePhoto(userId: UUID) {
        loadUser(userId)
        val profile = userProfileRepository.findById(userId).orElse(null) ?: return

        if (profile.profilePhotoData == null && profile.profilePhotoMimeType == null) {
            return
        }

        profile.profilePhotoData = null
        profile.profilePhotoMimeType = null
        userProfileRepository.save(profile)
    }

    private fun loadUser(userId: UUID): User {
        return userRepository.findById(userId)
            .orElseThrow { IllegalStateException("Authenticated user '$userId' not found") }
    }

    private fun validateReadOnlyFields(request: UpdateUserProfileRequest) {
        if (
            request.email != null ||
            request.userId != null ||
            request.role != null ||
            request.membershipStatus != null
        ) {
            throw ReadOnlyFieldException("Read-only fields cannot be updated")
        }
    }

    /**
     * Validates the emergency contact input and returns a Pair<name?, phone?>.
     * - null input → Pair(null, null) → clears the field
     * - non-null input → both name and phone must be non-blank, name ≤ 100 chars, phone ≤ 30 chars
     */
    private fun validateEmergencyContact(input: EmergencyContactInput?): Pair<String?, String?> {
        if (input == null) {
            return Pair(null, null)
        }

        val name = input.name?.trim()
        val phone = input.phone?.trim()

        if (name.isNullOrBlank() || phone.isNullOrBlank()) {
            throw InvalidEmergencyContactException("Emergency contact requires both name and phone")
        }

        if (name.length > 100) {
            throw InvalidEmergencyContactException("Emergency contact name must be 100 characters or fewer")
        }

        if (phone.length > 30) {
            throw InvalidEmergencyContactException("Emergency contact phone must be 30 characters or fewer")
        }

        return Pair(name, phone)
    }

    private fun normalizeOptionalName(
        value: String?,
        errorFactory: () -> RuntimeException
    ): String? {
        if (value == null) {
            return null
        }

        val normalized = value.trim()
        if (normalized.isBlank() || normalized.length > 50) {
            throw errorFactory()
        }

        return normalized
    }

    private fun normalizePhone(value: String?): String? {
        if (value == null) {
            return null
        }

        val normalized = value.trim().replace(Regex("[\\s\\-()]"), "")
        if (!PHONE_REGEX.matches(normalized) || normalized.length > 20) {
            throw InvalidPhoneException("Phone is invalid")
        }

        return normalized
    }

    private fun parseDateOfBirth(value: String?): LocalDate? {
        if (value == null) {
            return null
        }

        val normalized = value.trim()
        if (normalized.isEmpty()) {
            throw InvalidDateOfBirthException("Date of birth is invalid")
        }

        val parsed = try {
            LocalDate.parse(normalized)
        } catch (_: Exception) {
            throw InvalidDateOfBirthException("Date of birth is invalid")
        }

        if (parsed.isAfter(LocalDate.now())) {
            throw InvalidDateOfBirthException("Date of birth cannot be in the future")
        }

        return parsed
    }

    private fun normalizeOrderedList(
        items: List<String>?,
        errorFactory: () -> RuntimeException
    ): List<String> {
        if (items == null) {
            return emptyList()
        }

        if (items.size > 5) {
            throw errorFactory()
        }

        val seen = LinkedHashSet<String>()
        val normalizedItems = mutableListOf<String>()

        for (item in items) {
            val normalizedItem = item.trim()
            if (normalizedItem.isBlank() || normalizedItem.length > 50) {
                throw errorFactory()
            }

            val key = normalizedItem.lowercase(Locale.ROOT)
            if (seen.add(key)) {
                normalizedItems.add(normalizedItem)
            }
        }

        return normalizedItems
    }

    private fun toResponse(user: User, profile: UserProfile?): UserProfileResponse {
        if (profile == null) {
            return UserProfileResponse(
                userId = user.id,
                email = user.email,
                firstName = null,
                lastName = null,
                phone = null,
                dateOfBirth = null,
                fitnessGoals = emptyList(),
                preferredClassTypes = emptyList(),
                emergencyContact = null,
                hasProfilePhoto = false,
                profilePhotoUrl = null,
                createdAt = user.createdAt,
                updatedAt = user.updatedAt
            )
        }

        val hasProfilePhoto = profile.profilePhotoData != null
        val emergencyContact = if (profile.emergencyContactName != null && profile.emergencyContactPhone != null) {
            EmergencyContactDto(
                name = profile.emergencyContactName!!,
                phone = profile.emergencyContactPhone!!
            )
        } else {
            null
        }

        return UserProfileResponse(
            userId = user.id,
            email = user.email,
            firstName = profile.firstName,
            lastName = profile.lastName,
            phone = profile.phone,
            dateOfBirth = profile.dateOfBirth,
            fitnessGoals = profile.fitnessGoals.toList(),
            preferredClassTypes = profile.preferredClassTypes.toList(),
            emergencyContact = emergencyContact,
            hasProfilePhoto = hasProfilePhoto,
            profilePhotoUrl = if (hasProfilePhoto) "/api/v1/profile/me/photo" else null,
            createdAt = profile.createdAt,
            updatedAt = profile.updatedAt
        )
    }

    data class UserProfilePhoto(
        val data: ByteArray,
        val mimeType: String,
        val updatedAt: OffsetDateTime
    )

    companion object {
        private val PHONE_REGEX = Regex("^\\+[1-9]\\d{7,19}$")
    }
}

class ReadOnlyFieldException(message: String) : RuntimeException(message)
class InvalidFirstNameException(message: String) : RuntimeException(message)
class InvalidLastNameException(message: String) : RuntimeException(message)
class InvalidPhoneException(message: String) : RuntimeException(message)
class InvalidDateOfBirthException(message: String) : RuntimeException(message)
class InvalidFitnessGoalsException(message: String) : RuntimeException(message)
class InvalidPreferredClassTypesException(message: String) : RuntimeException(message)
class InvalidEmergencyContactException(message: String) : RuntimeException(message)
