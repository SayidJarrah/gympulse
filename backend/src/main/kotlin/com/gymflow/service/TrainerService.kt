package com.gymflow.service

import com.gymflow.domain.Trainer
import com.gymflow.dto.AffectedInstanceResponse
import com.gymflow.dto.TrainerRequest
import com.gymflow.dto.TrainerResponse
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.TrainerRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.time.OffsetDateTime
import java.util.UUID

@Service
@Transactional
class TrainerService(
    private val trainerRepository: TrainerRepository,
    private val classInstanceRepository: ClassInstanceRepository,
    private val photoValidationService: PhotoValidationService
) {

    @Transactional(readOnly = true)
    fun getTrainers(search: String?, pageable: Pageable): Page<TrainerResponse> {
        return trainerRepository.findBySearch(search, pageable).map { it.toResponse() }
    }

    @Transactional(readOnly = true)
    fun getTrainer(id: UUID): TrainerResponse {
        val trainer = trainerRepository.findById(id)
            .orElseThrow { TrainerNotFoundException("Trainer with id '$id' not found") }
        return trainer.toResponse()
    }

    fun createTrainer(request: TrainerRequest): TrainerResponse {
        val email = request.email!!
        if (trainerRepository.findByEmail(email) != null) {
            throw TrainerEmailConflictException("Trainer with email '$email' already exists")
        }

        val trainer = Trainer(
            firstName = request.firstName!!,
            lastName = request.lastName!!,
            email = email,
            phone = request.phone,
            bio = request.bio,
            specialisations = request.specialisations ?: emptyList(),
            experienceYears = request.experienceYears,
            profilePhotoUrl = request.profilePhotoUrl
        )

        return trainerRepository.save(trainer).toResponse()
    }

    fun updateTrainer(id: UUID, request: TrainerRequest): TrainerResponse {
        val trainer = trainerRepository.findById(id)
            .orElseThrow { TrainerNotFoundException("Trainer with id '$id' not found") }

        val email = request.email!!
        val existing = trainerRepository.findByEmail(email)
        if (existing != null && existing.id != trainer.id) {
            throw TrainerEmailConflictException("Trainer with email '$email' already exists")
        }

        trainer.firstName = request.firstName!!
        trainer.lastName = request.lastName!!
        trainer.email = email
        trainer.phone = request.phone
        trainer.bio = request.bio
        trainer.specialisations = request.specialisations ?: emptyList()
        trainer.experienceYears = request.experienceYears
        trainer.profilePhotoUrl = request.profilePhotoUrl

        return trainerRepository.save(trainer).toResponse()
    }

    fun deleteTrainer(id: UUID, force: Boolean) {
        val trainer = trainerRepository.findById(id)
            .orElseThrow { TrainerNotFoundException("Trainer with id '$id' not found") }

        val assignments = classInstanceRepository.findByTrainerId(trainer.id)
        if (assignments.isNotEmpty() && !force) {
            throw TrainerHasAssignmentsException(assignments.map { it.toAffectedInstance() })
        }

        trainerRepository.delete(trainer)
    }

    fun uploadPhoto(id: UUID, file: MultipartFile) {
        val trainer = trainerRepository.findById(id)
            .orElseThrow { TrainerNotFoundException("Trainer with id '$id' not found") }
        val validated = photoValidationService.validatePhoto(file)

        trainer.photoData = validated.bytes
        trainer.photoMimeType = validated.mimeType
        trainer.profilePhotoUrl = null

        trainerRepository.save(trainer)
    }

    @Transactional(readOnly = true)
    fun getPhoto(id: UUID): TrainerPhoto {
        val trainer = trainerRepository.findById(id)
            .orElseThrow { TrainerNotFoundException("Trainer with id '$id' not found") }

        val data = trainer.photoData ?: throw ImageNotFoundException("Trainer photo not found")
        val mimeType = trainer.photoMimeType ?: throw ImageNotFoundException("Trainer photo not found")

        return TrainerPhoto(data, mimeType, trainer.updatedAt)
    }

    fun deletePhoto(id: UUID) {
        val trainer = trainerRepository.findById(id)
            .orElseThrow { TrainerNotFoundException("Trainer with id '$id' not found") }

        trainer.photoData = null
        trainer.photoMimeType = null
        trainerRepository.save(trainer)
    }

    private fun Trainer.toResponse() = TrainerResponse(
        id = id,
        firstName = firstName,
        lastName = lastName,
        email = email,
        phone = phone,
        bio = bio,
        specialisations = specialisations,
        hasPhoto = profilePhotoUrl != null || photoData != null,
        photoUrl = when {
            profilePhotoUrl != null -> profilePhotoUrl
            photoData != null -> "/api/v1/trainers/$id/photo"
            else -> null
        },
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    private fun com.gymflow.domain.ClassInstance.toAffectedInstance() = AffectedInstanceResponse(
        id = id,
        name = name,
        scheduledAt = scheduledAt
    )

    data class TrainerPhoto(val data: ByteArray, val mimeType: String, val updatedAt: OffsetDateTime)
}

class TrainerEmailConflictException(message: String) : RuntimeException(message)
class TrainerNotFoundException(message: String) : RuntimeException(message)
class TrainerHasAssignmentsException(val affected: List<AffectedInstanceResponse>) : RuntimeException("Trainer has assignments")
