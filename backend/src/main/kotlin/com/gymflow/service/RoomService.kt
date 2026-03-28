package com.gymflow.service

import com.gymflow.domain.Room
import com.gymflow.dto.AffectedInstanceResponse
import com.gymflow.dto.RoomRequest
import com.gymflow.dto.RoomResponse
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.RoomRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional
class RoomService(
    private val roomRepository: RoomRepository,
    private val classInstanceRepository: ClassInstanceRepository
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

    private fun Room.toResponse() = RoomResponse(
        id = id,
        name = name,
        capacity = capacity,
        description = description,
        createdAt = createdAt
    )

    private fun com.gymflow.domain.ClassInstance.toAffectedInstance() = AffectedInstanceResponse(
        id = id,
        name = name,
        scheduledAt = scheduledAt
    )
}

class RoomNotFoundException(message: String) : RuntimeException(message)
class RoomNameConflictException(message: String) : RuntimeException(message)
class RoomHasInstancesException(val affected: List<AffectedInstanceResponse>) : RuntimeException("Room has instances")
