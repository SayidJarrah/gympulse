package com.gymflow.controller

import com.gymflow.dto.RoomRequest
import com.gymflow.dto.RoomResponse
import com.gymflow.service.RoomService
import jakarta.validation.Valid
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/rooms")
@PreAuthorize("hasRole('ADMIN')")
class RoomController(
    private val roomService: RoomService
) {

    @GetMapping
    fun listRooms(
        @RequestParam(required = false) search: String?,
        @PageableDefault(size = 20, sort = ["name"]) pageable: Pageable
    ): ResponseEntity<Page<RoomResponse>> {
        return ResponseEntity.ok(roomService.getRooms(search, pageable))
    }

    @PostMapping
    fun createRoom(@Valid @org.springframework.web.bind.annotation.RequestBody request: RoomRequest): ResponseEntity<RoomResponse> {
        val created = roomService.createRoom(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @PutMapping("/{id}")
    fun updateRoom(
        @PathVariable id: UUID,
        @Valid @org.springframework.web.bind.annotation.RequestBody request: RoomRequest
    ): ResponseEntity<RoomResponse> {
        return ResponseEntity.ok(roomService.updateRoom(id, request))
    }

    @DeleteMapping("/{id}")
    fun deleteRoom(
        @PathVariable id: UUID,
        @RequestParam(required = false, defaultValue = "false") force: Boolean
    ): ResponseEntity<Void> {
        roomService.deleteRoom(id, force)
        return ResponseEntity.noContent().build()
    }
}
