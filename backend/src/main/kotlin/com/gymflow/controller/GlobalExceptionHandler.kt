package com.gymflow.controller

import com.gymflow.service.EmailAlreadyExistsException
import com.gymflow.service.InvalidCredentialsException
import com.gymflow.service.InvalidStatusFilterException
import com.gymflow.service.PlanAlreadyActiveException
import com.gymflow.service.PlanAlreadyInactiveException
import com.gymflow.service.PlanHasActiveSubscribersException
import com.gymflow.service.PlanNotFoundException
import com.gymflow.service.RefreshTokenExpiredException
import com.gymflow.service.RefreshTokenInvalidException
import org.springframework.dao.OptimisticLockingFailureException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.AccessDeniedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

data class ErrorResponse(val error: String, val code: String)

@RestControllerAdvice
class GlobalExceptionHandler {

    /**
     * Handles Bean Validation failures. For membership plan fields, maps the failing
     * field name to a feature-specific error code. All other validation failures fall
     * back to the generic VALIDATION_ERROR code.
     *
     * Mapping (on the first failing field error):
     *   priceInCents  -> INVALID_PRICE
     *   durationDays  -> INVALID_DURATION
     *   name          -> INVALID_NAME
     *   description   -> INVALID_DESCRIPTION
     *   (anything else) -> VALIDATION_ERROR
     */
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(ex: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> {
        val firstField = ex.bindingResult.fieldErrors.firstOrNull()?.field
        val (message, code) = when (firstField) {
            "priceInCents" -> "Price must be greater than zero" to "INVALID_PRICE"
            "durationDays" -> "Duration must be greater than zero" to "INVALID_DURATION"
            "name" -> "Name must not be blank" to "INVALID_NAME"
            "description" -> "Description must not be blank" to "INVALID_DESCRIPTION"
            else -> {
                val msg = ex.bindingResult.fieldErrors
                    .joinToString("; ") { "${it.field}: ${it.defaultMessage}" }
                    .ifBlank { "Validation failed" }
                msg to "VALIDATION_ERROR"
            }
        }
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = message, code = code))
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

    // --- Membership plan exceptions ---

    @ExceptionHandler(PlanNotFoundException::class)
    fun handlePlanNotFound(ex: PlanNotFoundException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(error = ex.message ?: "Plan not found", code = "PLAN_NOT_FOUND"))
    }

    @ExceptionHandler(PlanAlreadyInactiveException::class)
    fun handlePlanAlreadyInactive(ex: PlanAlreadyInactiveException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = ex.message ?: "Plan is already inactive", code = "PLAN_ALREADY_INACTIVE"))
    }

    @ExceptionHandler(PlanAlreadyActiveException::class)
    fun handlePlanAlreadyActive(ex: PlanAlreadyActiveException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = ex.message ?: "Plan is already active", code = "PLAN_ALREADY_ACTIVE"))
    }

    @ExceptionHandler(PlanHasActiveSubscribersException::class)
    fun handlePlanHasActiveSubscribers(ex: PlanHasActiveSubscribersException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = ex.message ?: "Plan has active subscribers", code = "PLAN_HAS_ACTIVE_SUBSCRIBERS"))
    }

    @ExceptionHandler(InvalidStatusFilterException::class)
    fun handleInvalidStatusFilter(ex: InvalidStatusFilterException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = ex.message ?: "Invalid status filter", code = "INVALID_STATUS_FILTER"))
    }

    @ExceptionHandler(OptimisticLockingFailureException::class)
    fun handleOptimisticLockingFailure(ex: OptimisticLockingFailureException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(
                ErrorResponse(
                    error = "Another admin updated this plan at the same time. Please reload and try again.",
                    code = "PLAN_EDIT_CONFLICT"
                )
            )
    }

    // AccessDeniedException must be handled explicitly here because @RestControllerAdvice
    // intercepts it before Spring Security's ExceptionTranslationFilter can convert it to
    // a 403. Without this handler it falls through to the catch-all and returns 500.
    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(ex: AccessDeniedException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(ErrorResponse(error = "Access denied", code = "ACCESS_DENIED"))
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpectedException(ex: Exception): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse(error = "An unexpected error occurred", code = "INTERNAL_ERROR"))
    }
}
