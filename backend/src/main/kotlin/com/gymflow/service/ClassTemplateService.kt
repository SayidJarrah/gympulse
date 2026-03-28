package com.gymflow.service

import com.gymflow.domain.ClassTemplate
import com.gymflow.dto.AffectedInstanceResponse
import com.gymflow.dto.ClassTemplateRequest
import com.gymflow.dto.ClassTemplateResponse
import com.gymflow.dto.RoomSummaryResponse
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.ClassTemplateRepository
import com.gymflow.repository.RoomRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional
class ClassTemplateService(
    private val classTemplateRepository: ClassTemplateRepository,
    private val roomRepository: RoomRepository,
    private val classInstanceRepository: ClassInstanceRepository
) {

    @Transactional(readOnly = true)
    fun getTemplates(search: String?, category: String?, pageable: Pageable): Page<ClassTemplateResponse> {
        seedDefaultTemplatesIfEmpty()

        val page = when {
            !category.isNullOrBlank() && !search.isNullOrBlank() ->
                classTemplateRepository.findByCategoryAndNameContainingIgnoreCase(category, search, pageable)
            !category.isNullOrBlank() -> classTemplateRepository.findByCategory(category, pageable)
            !search.isNullOrBlank() -> classTemplateRepository.findByNameContainingIgnoreCase(search, pageable)
            else -> classTemplateRepository.findAll(pageable)
        }

        return page.map { it.toResponse() }
    }

    fun createTemplate(request: ClassTemplateRequest): ClassTemplateResponse {
        val name = request.name!!
        if (classTemplateRepository.findByName(name) != null) {
            throw ClassTemplateNameConflictException("Class template with name '$name' already exists")
        }

        val room = request.roomId?.let { id ->
            roomRepository.findById(id).orElseThrow { RoomNotFoundException("Room with id '$id' not found") }
        }

        val template = ClassTemplate(
            name = name,
            description = request.description,
            category = request.category!!,
            defaultDurationMin = request.defaultDurationMin!!,
            defaultCapacity = request.defaultCapacity!!,
            difficulty = request.difficulty!!,
            room = room,
            isSeeded = false
        )

        return classTemplateRepository.save(template).toResponse()
    }

    fun updateTemplate(id: UUID, request: ClassTemplateRequest): ClassTemplateResponse {
        val template = classTemplateRepository.findById(id)
            .orElseThrow { ClassTemplateNotFoundException("Class template with id '$id' not found") }

        val name = request.name!!
        val existing = classTemplateRepository.findByNameIgnoreCaseAndIdNot(name, template.id)
        if (existing != null) {
            throw ClassTemplateNameConflictException("Class template with name '$name' already exists")
        }

        val room = request.roomId?.let { roomId ->
            roomRepository.findById(roomId).orElseThrow { RoomNotFoundException("Room with id '$roomId' not found") }
        }

        template.name = name
        template.description = request.description
        template.category = request.category!!
        template.defaultDurationMin = request.defaultDurationMin!!
        template.defaultCapacity = request.defaultCapacity!!
        template.difficulty = request.difficulty!!
        template.room = room

        return classTemplateRepository.save(template).toResponse()
    }

    fun deleteTemplate(id: UUID, force: Boolean) {
        val template = classTemplateRepository.findById(id)
            .orElseThrow { ClassTemplateNotFoundException("Class template with id '$id' not found") }

        val instances = classInstanceRepository.findByTemplateIdAndDeletedAtIsNull(template.id)
        if (instances.isNotEmpty() && !force) {
            throw ClassTemplateHasInstancesException(instances.map { it.toAffectedInstance() })
        }

        if (instances.isNotEmpty()) {
            classInstanceRepository.clearTemplateAssignments(template.id)
        }

        classTemplateRepository.delete(template)
    }

    private fun seedDefaultTemplatesIfEmpty() {
        if (classTemplateRepository.count() != 0L) return

        val defaults = listOf(
            SeedTemplate("HIIT Bootcamp", "Cardio"),
            SeedTemplate("Yoga Flow", "Mind & Body"),
            SeedTemplate("Spin Cycle", "Cycling"),
            SeedTemplate("Pilates Core", "Strength"),
            SeedTemplate("Boxing Fundamentals", "Combat"),
            SeedTemplate("Strength & Conditioning", "Strength"),
            SeedTemplate("Zumba Dance", "Dance"),
            SeedTemplate("CrossFit WOD", "Functional"),
            SeedTemplate("Aqua Aerobics", "Aqua"),
            SeedTemplate("Meditation & Stretch", "Wellness")
        )

        val templates = defaults.map { seed ->
            ClassTemplate(
                name = seed.name,
                description = null,
                category = seed.category,
                defaultDurationMin = 60,
                defaultCapacity = 20,
                difficulty = "All Levels",
                room = null,
                isSeeded = true
            )
        }

        classTemplateRepository.saveAll(templates)
    }

    private fun ClassTemplate.toResponse() = ClassTemplateResponse(
        id = id,
        name = name,
        description = description,
        category = category,
        defaultDurationMin = defaultDurationMin,
        defaultCapacity = defaultCapacity,
        difficulty = difficulty,
        room = room?.let { RoomSummaryResponse(it.id, it.name) },
        isSeeded = isSeeded,
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    private fun com.gymflow.domain.ClassInstance.toAffectedInstance() = AffectedInstanceResponse(
        id = id,
        name = name,
        scheduledAt = scheduledAt
    )

    private data class SeedTemplate(val name: String, val category: String)
}

class ClassTemplateNotFoundException(message: String) : RuntimeException(message)
class ClassTemplateNameConflictException(message: String) : RuntimeException(message)
class ClassTemplateHasInstancesException(val affected: List<AffectedInstanceResponse>) : RuntimeException("Class template has instances")
