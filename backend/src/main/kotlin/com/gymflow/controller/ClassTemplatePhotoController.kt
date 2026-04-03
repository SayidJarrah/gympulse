package com.gymflow.controller

import com.gymflow.service.ClassTemplateService
import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.time.Duration
import java.util.UUID

@RestController
class ClassTemplatePhotoController(
    private val classTemplateService: ClassTemplateService
) {

    @PostMapping("/api/v1/admin/class-templates/{id}/photo")
    @PreAuthorize("hasRole('ADMIN')")
    fun uploadPhoto(
        @PathVariable id: UUID,
        @RequestParam("photo") photo: MultipartFile
    ): ResponseEntity<Map<String, String>> {
        classTemplateService.uploadPhoto(id, photo)
        return ResponseEntity.ok(mapOf("message" to "Photo uploaded successfully"))
    }

    @GetMapping("/api/v1/class-templates/{id}/photo")
    fun getPhoto(@PathVariable id: UUID): ResponseEntity<ByteArray> {
        val photo = classTemplateService.getPhoto(id)
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
            .eTag(photo.updatedAt.toInstant().toEpochMilli().toString())
            .contentType(MediaType.parseMediaType(photo.mimeType))
            .body(photo.data)
    }

    @DeleteMapping("/api/v1/admin/class-templates/{id}/photo")
    @PreAuthorize("hasRole('ADMIN')")
    fun deletePhoto(@PathVariable id: UUID): ResponseEntity<Void> {
        classTemplateService.deletePhoto(id)
        return ResponseEntity.noContent().build()
    }
}
