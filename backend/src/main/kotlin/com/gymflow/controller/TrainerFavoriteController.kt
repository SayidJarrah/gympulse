package com.gymflow.controller

import com.gymflow.dto.TrainerFavoriteResponse
import com.gymflow.service.TrainerFavoriteService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/trainers/{id}/favorites")
class TrainerFavoriteController(
    private val trainerFavoriteService: TrainerFavoriteService
) {

    @PostMapping
    fun addFavorite(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<TrainerFavoriteResponse> {
        val userId = UUID.fromString(authentication.name)
        val response = trainerFavoriteService.addFavorite(userId, id)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @DeleteMapping
    fun removeFavorite(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<Void> {
        val userId = UUID.fromString(authentication.name)
        trainerFavoriteService.removeFavorite(userId, id)
        return ResponseEntity.noContent().build()
    }
}
