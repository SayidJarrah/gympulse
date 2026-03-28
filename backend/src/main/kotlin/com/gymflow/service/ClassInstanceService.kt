package com.gymflow.service

import com.gymflow.domain.ClassInstance
import com.gymflow.dto.ClassInstancePatchRequest
import com.gymflow.dto.ClassInstanceRequest
import com.gymflow.dto.ClassInstanceResponse
import com.gymflow.dto.CopyWeekResponse
import com.gymflow.dto.RoomSummaryResponse
import com.gymflow.dto.TrainerSummaryResponse
import com.gymflow.dto.WeekScheduleResponse
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.ClassTemplateRepository
import com.gymflow.repository.RoomRepository
import com.gymflow.repository.TrainerRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@Service
@Transactional
class ClassInstanceService(
    private val classInstanceRepository: ClassInstanceRepository,
    private val trainerRepository: TrainerRepository,
    private val roomRepository: RoomRepository,
    private val classTemplateRepository: ClassTemplateRepository
) {

    @Transactional(readOnly = true)
    fun getWeekSchedule(week: String): WeekScheduleResponse {
        val range = ScheduleWeekParser.parseWeek(week)
        val instances = classInstanceRepository.findWithDetailsBetween(range.start, range.end)
        val conflicts = computeRoomConflicts(instances)

        return WeekScheduleResponse(
            week = range.week,
            instances = instances.map { instance ->
                instance.toResponse(conflicts[instance.id] == true)
            }
        )
    }

    @Transactional(readOnly = true)
    fun getInstance(id: UUID): ClassInstanceResponse {
        val instance = classInstanceRepository.findWithDetailsById(id)
            ?: throw ClassInstanceNotFoundException("Class instance with id '$id' not found")

        val hasRoomConflict = instance.room?.let { room ->
            val endTime = instance.scheduledAt.plusMinutes(instance.durationMin.toLong())
            classInstanceRepository.countRoomOverlaps(room.id, instance.scheduledAt, endTime, instance.id) > 0
        } ?: false

        return instance.toResponse(hasRoomConflict)
    }

    fun createInstance(request: ClassInstanceRequest): ClassInstanceResponse {
        val scheduledAt = request.scheduledAt!!
        validateSlotAlignment(scheduledAt)

        val durationMin = request.durationMin!!
        val capacity = request.capacity!!

        val room = request.roomId?.let { roomId ->
            roomRepository.findById(roomId).orElseThrow { RoomNotFoundException("Room with id '$roomId' not found") }
        }

        val template = request.templateId?.let { templateId ->
            classTemplateRepository.findById(templateId)
                .orElseThrow { ClassTemplateNotFoundException("Class template with id '$templateId' not found") }
        }

        val trainerIds = request.trainerIds ?: emptyList()
        val trainers = loadTrainers(trainerIds)
        ensureTrainerAvailability(trainers.map { it.id }, scheduledAt, durationMin, excludeId = null)

        val instance = ClassInstance(
            template = template,
            name = request.name!!,
            scheduledAt = scheduledAt,
            durationMin = durationMin,
            capacity = capacity,
            room = room,
            trainers = trainers.toMutableSet(),
            type = "GROUP"
        )

        val saved = classInstanceRepository.save(instance)

        val hasRoomConflict = room?.let {
            val endTime = scheduledAt.plusMinutes(durationMin.toLong())
            classInstanceRepository.countRoomOverlaps(it.id, scheduledAt, endTime, saved.id) > 0
        } ?: false

        return saved.toResponse(hasRoomConflict)
    }

    fun updateInstance(id: UUID, request: ClassInstancePatchRequest): ClassInstanceResponse {
        val instance = classInstanceRepository.findWithDetailsById(id)
            ?: throw ClassInstanceNotFoundException("Class instance with id '$id' not found")

        val updatedScheduledAt = request.scheduledAt ?: instance.scheduledAt
        val updatedDurationMin = request.durationMin ?: instance.durationMin
        val updatedCapacity = request.capacity ?: instance.capacity

        validateSlotAlignment(updatedScheduledAt)

        val updatedRoom = if (request.roomId == null) {
            null
        } else {
            roomRepository.findById(request.roomId)
                .orElseThrow { RoomNotFoundException("Room with id '${request.roomId}' not found") }
        }

        val updatedTrainerIds = request.trainerIds ?: instance.trainers.map { it.id }
        val updatedTrainers = loadTrainers(updatedTrainerIds)
        ensureTrainerAvailability(updatedTrainers.map { it.id }, updatedScheduledAt, updatedDurationMin, excludeId = instance.id)

        instance.scheduledAt = updatedScheduledAt
        instance.durationMin = updatedDurationMin
        instance.capacity = updatedCapacity
        instance.room = updatedRoom
        instance.trainers = updatedTrainers.toMutableSet()

        val saved = classInstanceRepository.save(instance)

        val hasRoomConflict = updatedRoom?.let {
            val endTime = updatedScheduledAt.plusMinutes(updatedDurationMin.toLong())
            classInstanceRepository.countRoomOverlaps(it.id, updatedScheduledAt, endTime, saved.id) > 0
        } ?: false

        return saved.toResponse(hasRoomConflict)
    }

    fun deleteInstance(id: UUID) {
        val instance = classInstanceRepository.findById(id)
            .orElseThrow { ClassInstanceNotFoundException("Class instance with id '$id' not found") }
        classInstanceRepository.delete(instance)
    }

    fun copyWeek(sourceWeek: String): CopyWeekResponse {
        val sourceRange = ScheduleWeekParser.parseWeek(sourceWeek)
        val targetRange = ScheduleWeekParser.nextWeek(sourceRange)

        val sourceInstances = classInstanceRepository.findWithDetailsBetween(sourceRange.start, sourceRange.end)

        var copied = 0
        var skipped = 0

        sourceInstances.forEach { instance ->
            val targetScheduledAt = instance.scheduledAt.plusWeeks(1)
            if (classInstanceRepository.existsByScheduledAtAndName(targetScheduledAt, instance.name)) {
                skipped += 1
            } else {
                val copy = ClassInstance(
                    template = instance.template,
                    name = instance.name,
                    scheduledAt = targetScheduledAt,
                    durationMin = instance.durationMin,
                    capacity = instance.capacity,
                    room = instance.room,
                    trainers = instance.trainers.toMutableSet(),
                    type = instance.type
                )
                classInstanceRepository.save(copy)
                copied += 1
            }
        }

        return CopyWeekResponse(
            copied = copied,
            skipped = skipped,
            targetWeek = targetRange.week
        )
    }

    private fun validateSlotAlignment(scheduledAt: OffsetDateTime) {
        val utc = scheduledAt.withOffsetSameInstant(ZoneOffset.UTC)
        if (utc.minute !in setOf(0, 30)) {
            throw InvalidSlotException("Scheduled time must be on a 30-minute boundary")
        }
    }

    private fun loadTrainers(trainerIds: List<UUID>): List<com.gymflow.domain.Trainer> {
        if (trainerIds.isEmpty()) return emptyList()

        val trainers = trainerRepository.findAllById(trainerIds).toList()
        if (trainers.size != trainerIds.size) {
            throw TrainerNotFoundException("Trainer not found")
        }
        return trainers
    }

    private fun ensureTrainerAvailability(
        trainerIds: List<UUID>,
        start: OffsetDateTime,
        durationMin: Int,
        excludeId: UUID?
    ) {
        if (trainerIds.isEmpty()) return

        val end = start.plusMinutes(durationMin.toLong())
        trainerIds.forEach { trainerId ->
            val overlaps = if (excludeId == null) {
                classInstanceRepository.findTrainerOverlaps(trainerId, start, end)
            } else {
                classInstanceRepository.findTrainerOverlapsExcluding(trainerId, excludeId, start, end)
            }
            if (overlaps.isNotEmpty()) {
                throw TrainerScheduleConflictException("Trainer schedule conflict")
            }
        }
    }

    private fun computeRoomConflicts(instances: List<ClassInstance>): Map<UUID, Boolean> {
        val conflicts = mutableMapOf<UUID, Boolean>()
        val byRoom = instances.filter { it.room != null }.groupBy { it.room!!.id }

        byRoom.values.forEach { roomInstances ->
            val sorted = roomInstances.sortedBy { it.scheduledAt }
            for (i in sorted.indices) {
                val current = sorted[i]
                val currentEnd = current.scheduledAt.plusMinutes(current.durationMin.toLong())
                for (j in i + 1 until sorted.size) {
                    val next = sorted[j]
                    if (next.scheduledAt >= currentEnd) break
                    conflicts[current.id] = true
                    conflicts[next.id] = true
                }
            }
        }

        return conflicts
    }

    private fun ClassInstance.toResponse(hasRoomConflict: Boolean) = ClassInstanceResponse(
        id = id,
        templateId = template?.id,
        name = name,
        type = type,
        scheduledAt = scheduledAt,
        durationMin = durationMin,
        capacity = capacity,
        room = room?.let { RoomSummaryResponse(it.id, it.name) },
        trainers = trainers.map { TrainerSummaryResponse(it.id, it.firstName, it.lastName) },
        hasRoomConflict = hasRoomConflict,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}

class ClassInstanceNotFoundException(message: String) : RuntimeException(message)
class TrainerScheduleConflictException(message: String) : RuntimeException(message)
class InvalidSlotException(message: String) : RuntimeException(message)
