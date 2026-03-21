package com.gymflow.controller

import com.gymflow.service.EmailAlreadyExistsException
import com.gymflow.service.InvalidCredentialsException
import com.gymflow.service.RefreshTokenExpiredException
import com.gymflow.service.RefreshTokenInvalidException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

data class ErrorResponse(val error: String, val code: String)

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(ex: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> {
        val message = ex.bindingResult.fieldErrors
            .joinToString("; ") { "${it.field}: ${it.defaultMessage}" }
            .ifBlank { "Validation failed" }
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = message, code = "VALIDATION_ERROR"))
    }

    @ExceptionHandler(EmailAlreadyExistsException::class)
    fun handleEmailAlreadyExists(ex: EmailAlreadyExistsException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = ex.message ?: "Email already exists", code = "EMAIL_ALREADY_EXISTS"))
    }

    @ExceptionHandler(InvalidCredentialsException::class)
    fun handleInvalidCredentials(ex: InvalidCredentialsException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(ErrorResponse(error = ex.message ?: "Invalid credentials", code = "INVALID_CREDENTIALS"))
    }

    @ExceptionHandler(RefreshTokenInvalidException::class)
    fun handleRefreshTokenInvalid(ex: RefreshTokenInvalidException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(ErrorResponse(error = ex.message ?: "Refresh token is invalid", code = "REFRESH_TOKEN_INVALID"))
    }

    @ExceptionHandler(RefreshTokenExpiredException::class)
    fun handleRefreshTokenExpired(ex: RefreshTokenExpiredException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(ErrorResponse(error = ex.message ?: "Refresh token has expired", code = "REFRESH_TOKEN_EXPIRED"))
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpectedException(ex: Exception): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse(error = "An unexpected error occurred", code = "INTERNAL_ERROR"))
    }
}
