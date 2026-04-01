package com.gymflow.controller

import com.gymflow.dto.TrainerDiscoveryResponse
import com.gymflow.dto.TrainerProfileResponse
import com.gymflow.service.TrainerDiscoveryService
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/trainers")
class TrainerDiscoveryController(
    private val trainerDiscoveryService: TrainerDiscoveryService
) {

    @GetMapping("/favorites")          // MUST appear before /{id} mapping
    fun getMyFavorites(
        @RequestParam(defaultValue = "lastName,asc") sort: String,
        @PageableDefault(size = 12) pageable: Pageable,
        authentication: Authentication
    ): ResponseEntity<Page<TrainerDiscoveryResponse>> {
        val userId = UUID.fromString(authentication.name)
        return ResponseEntity.ok(trainerDiscoveryService.getFavoriteTrainers(sort, pageable, userId))
    }

    @GetMapping
    fun listTrainers(
        @RequestParam(required = false) specialization: List<String>?,
        @RequestParam(defaultValue = "lastName,asc") sort: String,
        @PageableDefault(size = 12) pageable: Pageable,
        authentication: Authentication
    ): ResponseEntity<Page<TrainerDiscoveryResponse>> {
        val userId = UUID.fromString(authentication.name)
        return ResponseEntity.ok(trainerDiscoveryService.listTrainers(specialization, sort, pageable, userId))
    }

    @GetMapping("/{id}")
    fun getTrainer(
        @PathVariable id: UUID,
        authentication: Authentication
    ): ResponseEntity<TrainerProfileResponse> {
        val userId = UUID.fromString(authentication.name)
        return ResponseEntity.ok(trainerDiscoveryService.getTrainerProfile(id, userId))
    }
}
