package com.gymflow.service

import com.gymflow.domain.Room
import com.gymflow.dto.AffectedInstanceResponse
import com.gymflow.dto.RoomRequest
import com.gymflow.dto.RoomResponse
import com.gymflow.dto.RoomSummaryResponse
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.RoomRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.time.OffsetDateTime
import java.util.UUID

@Service
@Transactional
class RoomService(
    private val roomRepository: RoomRepository,
    private val classInstanceRepository: ClassInstanceRepository,
    private val photoValidationService: PhotoValidationService
) {

    @Transactional(readOnly = true)
    fun getRooms(search: String?, pageable: Pageable): Page<RoomResponse> {
        val page = if (search.isNullOrBlank()) {
            roomRepository.findAll(pageable)
        } else {
            roomRepository.findByNameContainingIgnoreCase(search, pageable)
        }
        return page.map { it.toResponse() }
    }

    fun createRoom(request: RoomRequest): RoomResponse {
        val name = request.name!!
        if (roomRepository.findByNameIgnoreCase(name) != null) {
            throw RoomNameConflictException("Room with name '$name' already exists")
        }

        val room = Room(
            name = name,
            capacity = request.capacity,
            description = request.description
        )

        return roomRepository.save(room).toResponse()
    }

    fun updateRoom(id: UUID, request: RoomRequest): RoomResponse {
        val room = roomRepository.findById(id)
            .orElseThrow { RoomNotFoundException("Room with id '$id' not found") }

        val name = request.name!!
        val existing = roomRepository.findByNameIgnoreCaseAndIdNot(name, room.id)
        if (existing != null) {
            throw RoomNameConflictException("Room with name '$name' already exists")
        }

        room.name = name
        room.capacity = request.capacity
        room.description = request.description

        return roomRepository.save(room).toResponse()
    }

    fun deleteRoom(id: UUID, force: Boolean) {
        val room = roomRepository.findById(id)
            .orElseThrow { RoomNotFoundException("Room with id '$id' not found") }

        val instances = classInstanceRepository.findByRoomIdAndDeletedAtIsNull(room.id)
        if (instances.isNotEmpty() && !force) {
            throw RoomHasInstancesException(instances.map { it.toAffectedInstance() })
        }

        if (instances.isNotEmpty()) {
            classInstanceRepository.clearRoomAssignments(room.id)
        }

        roomRepository.delete(room)
    }

    fun uploadPhoto(id: UUID, file: MultipartFile) {
        val room = roomRepository.findById(id)
            .orElseThrow { RoomNotFoundException("Room with id '$id' not found") }
        val validated = photoValidationService.validatePhoto(file)

        room.photoData = validated.bytes
        room.photoMimeType = validated.mimeType
        roomRepository.save(room)
    }

    @Transactional(readOnly = true)
    fun getPhoto(id: UUID): RoomPhoto {
        val room = roomRepository.findById(id)
            .orElseThrow { RoomNotFoundException("Room with id '$id' not found") }
        val photoData = room.photoData ?: throw ImageNotFoundException("Room photo not found")
        val mimeType = room.photoMimeType ?: throw ImageNotFoundException("Room photo not found")

        return RoomPhoto(photoData, mimeType, room.updatedAt)
    }

    fun deletePhoto(id: UUID) {
        val room = roomRepository.findById(id)
            .orElseThrow { RoomNotFoundException("Room with id '$id' not found") }

        room.photoData = null
        room.photoMimeType = null
        roomRepository.save(room)
    }

    private fun Room.toResponse() = RoomResponse(
        id = id,
        name = name,
        capacity = capacity,
        description = description,
        hasPhoto = photoData != null,
        photoUrl = if (photoData != null) "/api/v1/rooms/$id/photo" else null,
        createdAt = createdAt
    )

    fun Room.toSummaryResponse() = RoomSummaryResponse(
        id = id,
        name = name,
        photoUrl = if (photoData != null) "/api/v1/rooms/$id/photo" else null
    )

    private fun com.gymflow.domain.ClassInstance.toAffectedInstance() = AffectedInstanceResponse(
        id = id,
        name = name,
        scheduledAt = scheduledAt
    )

    data class RoomPhoto(
        val data: ByteArray,
        val mimeType: String,
        val updatedAt: OffsetDateTime
    )
}

class RoomNotFoundException(message: String) : RuntimeException(message)
class RoomNameConflictException(message: String) : RuntimeException(message)
class RoomHasInstancesException(val affected: List<AffectedInstanceResponse>) : RuntimeException("Room has instances")
