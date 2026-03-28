package com.gymflow.controller

import com.gymflow.service.TrainerService
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@RestController
class TrainerPhotoController(
    private val trainerService: TrainerService
) {

    @PostMapping("/api/v1/admin/trainers/{id}/photo")
    @PreAuthorize("hasRole('ADMIN')")
    fun uploadPhoto(
        @PathVariable id: UUID,
        @RequestParam("photo") photo: MultipartFile
    ): ResponseEntity<Map<String, String>> {
        trainerService.uploadPhoto(id, photo)
        return ResponseEntity.ok(mapOf("message" to "Photo uploaded successfully"))
    }

    @GetMapping("/api/v1/trainers/{id}/photo")
    fun getPhoto(@PathVariable id: UUID): ResponseEntity<ByteArray> {
        val photo = trainerService.getPhoto(id)
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(photo.mimeType))
            .body(photo.data)
    }
}
