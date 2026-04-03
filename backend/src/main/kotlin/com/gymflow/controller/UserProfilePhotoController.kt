package com.gymflow.controller

import com.gymflow.service.UserProfileService
import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@RestController
@RequestMapping("/api/v1/profile/me/photo")
@PreAuthorize("hasRole('USER')")
class UserProfilePhotoController(
    private val userProfileService: UserProfileService
) {

    @PostMapping
    fun uploadPhoto(
        authentication: Authentication,
        @RequestParam("photo") photo: MultipartFile
    ): ResponseEntity<Map<String, String>> {
        val userId = UUID.fromString(authentication.name)
        userProfileService.uploadMyProfilePhoto(userId, photo)
        return ResponseEntity.ok(mapOf("message" to "Photo uploaded successfully"))
    }

    @GetMapping
    fun getPhoto(authentication: Authentication): ResponseEntity<ByteArray> {
        val userId = UUID.fromString(authentication.name)
        val photo = userProfileService.getMyProfilePhoto(userId)

        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .contentType(MediaType.parseMediaType(photo.mimeType))
            .body(photo.data)
    }

    @DeleteMapping
    fun deletePhoto(authentication: Authentication): ResponseEntity<Void> {
        val userId = UUID.fromString(authentication.name)
        userProfileService.deleteMyProfilePhoto(userId)
        return ResponseEntity.noContent().build()
    }
}
