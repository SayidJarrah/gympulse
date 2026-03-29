package com.gymflow.controller

import com.gymflow.dto.TrainerRequest
import com.gymflow.dto.TrainerResponse
import com.gymflow.service.TrainerService
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
@RequestMapping("/api/v1/admin/trainers")
@PreAuthorize("hasRole('ADMIN')")
class AdminTrainerController(
    private val trainerService: TrainerService
) {

    @GetMapping
    fun listTrainers(
        @RequestParam(required = false) search: String?,
        @PageableDefault(size = 20, sort = ["lastName"]) pageable: Pageable
    ): ResponseEntity<Page<TrainerResponse>> {
        return ResponseEntity.ok(trainerService.getTrainers(search, pageable))
    }

    @GetMapping("/{id}")
    fun getTrainer(@PathVariable id: UUID): ResponseEntity<TrainerResponse> {
        return ResponseEntity.ok(trainerService.getTrainer(id))
    }

    @PostMapping
    fun createTrainer(@Valid @org.springframework.web.bind.annotation.RequestBody request: TrainerRequest): ResponseEntity<TrainerResponse> {
        val created = trainerService.createTrainer(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @PutMapping("/{id}")
    fun updateTrainer(
        @PathVariable id: UUID,
        @Valid @org.springframework.web.bind.annotation.RequestBody request: TrainerRequest
    ): ResponseEntity<TrainerResponse> {
        return ResponseEntity.ok(trainerService.updateTrainer(id, request))
    }

    @DeleteMapping("/{id}")
    fun deleteTrainer(
        @PathVariable id: UUID,
        @RequestParam(required = false, defaultValue = "false") force: Boolean
    ): ResponseEntity<Void> {
        trainerService.deleteTrainer(id, force)
        return ResponseEntity.noContent().build()
    }
}
