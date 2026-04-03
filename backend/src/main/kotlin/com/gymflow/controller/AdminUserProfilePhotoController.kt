package com.gymflow.controller

import com.gymflow.service.UserProfileService
import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
class AdminUserProfilePhotoController(
    private val userProfileService: UserProfileService
) {

    @GetMapping("/{userId}/photo")
    fun getPhoto(@PathVariable userId: UUID): ResponseEntity<ByteArray> {
        val photo = userProfileService.getProfilePhotoForAdmin(userId)
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .contentType(MediaType.parseMediaType(photo.mimeType))
            .body(photo.data)
    }
}
