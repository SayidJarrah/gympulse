package com.gymflow.service

import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile

@Service
class PhotoValidationService {

    fun validatePhoto(file: MultipartFile): ValidatedPhoto {
        if (file.isEmpty) {
            throw ImageRequiredException("Image file is required")
        }

        if (file.size > MAX_PHOTO_SIZE_BYTES) {
            throw ImageTooLargeException("File exceeds the 5 MB limit")
        }

        val contentType = file.contentType?.trim().orEmpty()
        if (contentType !in SUPPORTED_MIME_TYPES) {
            throw InvalidImageFormatException("File must be JPEG, PNG or WEBP")
        }

        return ValidatedPhoto(
            bytes = file.bytes,
            mimeType = contentType
        )
    }

    data class ValidatedPhoto(
        val bytes: ByteArray,
        val mimeType: String
    )

    companion object {
        const val MAX_PHOTO_SIZE_BYTES = 5L * 1024 * 1024
        val SUPPORTED_MIME_TYPES: Set<String> = setOf("image/jpeg", "image/png", "image/webp")
    }
}

class ImageRequiredException(message: String) : RuntimeException(message)
class InvalidImageFormatException(message: String) : RuntimeException(message)
class ImageTooLargeException(message: String) : RuntimeException(message)
class ImageNotFoundException(message: String) : RuntimeException(message)
