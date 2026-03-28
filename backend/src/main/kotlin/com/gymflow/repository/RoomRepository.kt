package com.gymflow.repository

import com.gymflow.domain.Room
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface RoomRepository : JpaRepository<Room, UUID> {
    fun findByNameIgnoreCase(name: String): Room?

    fun findByNameContainingIgnoreCase(name: String, pageable: Pageable): Page<Room>

    fun findByNameIgnoreCaseAndIdNot(name: String, id: UUID): Room?
}
