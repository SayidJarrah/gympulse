package com.gymflow.controller

import com.gymflow.dto.RoomHasInstancesResponse
import com.gymflow.dto.TemplateHasInstancesResponse
import com.gymflow.dto.TrainerHasAssignmentsResponse
import com.gymflow.service.ClassInstanceNotFoundException
import com.gymflow.service.ClassTemplateHasInstancesException
import com.gymflow.service.ClassTemplateNameConflictException
import com.gymflow.service.ClassTemplateNotFoundException
import com.gymflow.service.EmailAlreadyExistsException
import com.gymflow.service.ImportFileTooLargeException
import com.gymflow.service.ImportFormatInvalidException
import com.gymflow.service.InvalidAnchorDateException
import com.gymflow.service.InvalidCredentialsException
import com.gymflow.service.InvalidExportFormatException
import com.gymflow.service.InvalidDateOfBirthException
import com.gymflow.service.InvalidFirstNameException
import com.gymflow.service.InvalidMembershipStatusFilterException
import com.gymflow.service.InvalidFitnessGoalsException
import com.gymflow.service.InvalidLastNameException
import com.gymflow.service.InvalidPhoneException
import com.gymflow.service.InvalidPreferredClassTypesException
import com.gymflow.service.InvalidScheduleViewException
import com.gymflow.service.InvalidSlotException
import com.gymflow.service.InvalidStatusFilterException
import com.gymflow.service.InvalidTimeZoneException
import com.gymflow.service.InvalidWeekFormatException
import com.gymflow.service.MembershipAlreadyActiveException
import com.gymflow.service.MembershipNotActiveException
import com.gymflow.service.MembershipNotFoundException
import com.gymflow.service.NoActiveMembershipException
import com.gymflow.service.PhotoNotFoundException
import com.gymflow.service.PhotoTooLargeException
import com.gymflow.service.PlanAlreadyActiveException
import com.gymflow.service.PlanAlreadyInactiveException
import com.gymflow.service.PlanHasActiveSubscribersException
import com.gymflow.service.PlanNotAvailableException
import com.gymflow.service.PlanNotFoundException
import com.gymflow.service.RefreshTokenExpiredException
import com.gymflow.service.RefreshTokenInvalidException
import com.gymflow.service.ReadOnlyFieldException
import com.gymflow.service.RoomHasInstancesException
import com.gymflow.service.RoomNameConflictException
import com.gymflow.service.RoomNotFoundException
import com.gymflow.service.TrainerEmailConflictException
import com.gymflow.service.TrainerHasAssignmentsException
import com.gymflow.service.TrainerNotFoundException
import com.gymflow.service.TrainerScheduleConflictException
import com.gymflow.service.InvalidPhotoFormatException
import com.gymflow.exception.AlreadyFavoritedException
import com.gymflow.exception.FavoriteNotFoundException
import com.gymflow.exception.MembershipRequiredException
import com.gymflow.exception.InvalidSortFieldException
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
            "planId" -> "A valid plan must be selected" to "INVALID_PLAN_ID"
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

    // --- User membership exceptions ---

    @ExceptionHandler(MembershipAlreadyActiveException::class)
    fun handleMembershipAlreadyActive(ex: MembershipAlreadyActiveException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = "You already have an active membership", code = "MEMBERSHIP_ALREADY_ACTIVE"))
    }

    @ExceptionHandler(NoActiveMembershipException::class)
    fun handleNoActiveMembership(ex: NoActiveMembershipException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(error = "No active membership found", code = "NO_ACTIVE_MEMBERSHIP"))
    }

    @ExceptionHandler(MembershipNotFoundException::class)
    fun handleMembershipNotFound(ex: MembershipNotFoundException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(error = "Membership not found", code = "MEMBERSHIP_NOT_FOUND"))
    }

    @ExceptionHandler(MembershipNotActiveException::class)
    fun handleMembershipNotActive(ex: MembershipNotActiveException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = "This membership is already cancelled or expired", code = "MEMBERSHIP_NOT_ACTIVE"))
    }

    @ExceptionHandler(PlanNotAvailableException::class)
    fun handlePlanNotAvailable(ex: PlanNotAvailableException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ErrorResponse(error = "This plan is not available for purchase", code = "PLAN_NOT_AVAILABLE"))
    }

    @ExceptionHandler(InvalidMembershipStatusFilterException::class)
    fun handleInvalidMembershipStatusFilter(ex: InvalidMembershipStatusFilterException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = "Invalid status filter. Use ACTIVE, CANCELLED, or EXPIRED", code = "INVALID_STATUS_FILTER"))
    }

    @ExceptionHandler(ReadOnlyFieldException::class)
    fun handleReadOnlyField(ex: ReadOnlyFieldException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = "Email and account ownership fields cannot be changed here.", code = "READ_ONLY_FIELD"))
    }

    @ExceptionHandler(InvalidFirstNameException::class)
    fun handleInvalidFirstName(ex: InvalidFirstNameException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = "First name must be between 1 and 50 characters.", code = "INVALID_FIRST_NAME"))
    }

    @ExceptionHandler(InvalidLastNameException::class)
    fun handleInvalidLastName(ex: InvalidLastNameException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = "Last name must be between 1 and 50 characters.", code = "INVALID_LAST_NAME"))
    }

    @ExceptionHandler(InvalidPhoneException::class)
    fun handleInvalidPhone(ex: InvalidPhoneException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = "Enter a valid international phone number.", code = "INVALID_PHONE"))
    }

    @ExceptionHandler(InvalidDateOfBirthException::class)
    fun handleInvalidDateOfBirth(ex: InvalidDateOfBirthException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = "Enter a valid date of birth that is not in the future.", code = "INVALID_DATE_OF_BIRTH"))
    }

    @ExceptionHandler(InvalidFitnessGoalsException::class)
    fun handleInvalidFitnessGoals(ex: InvalidFitnessGoalsException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(
                ErrorResponse(
                    error = "Fitness goals must contain up to 5 items, each 1 to 50 characters long.",
                    code = "INVALID_FITNESS_GOALS"
                )
            )
    }

    @ExceptionHandler(InvalidPreferredClassTypesException::class)
    fun handleInvalidPreferredClassTypes(ex: InvalidPreferredClassTypesException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(
                ErrorResponse(
                    error = "Preferred class types must contain up to 5 items, each 1 to 50 characters long.",
                    code = "INVALID_PREFERRED_CLASS_TYPES"
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

    // --- Trainer / Room / Scheduler exceptions ---

    @ExceptionHandler(TrainerEmailConflictException::class)
    fun handleTrainerEmailConflict(ex: TrainerEmailConflictException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = ex.message ?: "Trainer email conflict", code = "TRAINER_EMAIL_CONFLICT"))
    }

    @ExceptionHandler(TrainerNotFoundException::class)
    fun handleTrainerNotFound(ex: TrainerNotFoundException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(error = ex.message ?: "Trainer not found", code = "TRAINER_NOT_FOUND"))
    }

    @ExceptionHandler(TrainerHasAssignmentsException::class)
    fun handleTrainerHasAssignments(ex: TrainerHasAssignmentsException): ResponseEntity<TrainerHasAssignmentsResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(
                TrainerHasAssignmentsResponse(
                    error = "Trainer is assigned to scheduled classes",
                    code = "TRAINER_HAS_ASSIGNMENTS",
                    affectedInstances = ex.affected
                )
            )
    }

    @ExceptionHandler(TrainerScheduleConflictException::class)
    fun handleTrainerScheduleConflict(ex: TrainerScheduleConflictException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = ex.message ?: "Trainer schedule conflict", code = "TRAINER_SCHEDULE_CONFLICT"))
    }

    @ExceptionHandler(InvalidPhotoFormatException::class)
    fun handleInvalidPhotoFormat(ex: InvalidPhotoFormatException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
            .body(ErrorResponse(error = ex.message ?: "Invalid photo format", code = "INVALID_PHOTO_FORMAT"))
    }

    @ExceptionHandler(PhotoTooLargeException::class)
    fun handlePhotoTooLarge(ex: PhotoTooLargeException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(ErrorResponse(error = ex.message ?: "Photo too large", code = "PHOTO_TOO_LARGE"))
    }

    @ExceptionHandler(PhotoNotFoundException::class)
    fun handlePhotoNotFound(ex: PhotoNotFoundException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(error = ex.message ?: "Photo not found", code = "PHOTO_NOT_FOUND"))
    }

    @ExceptionHandler(RoomNotFoundException::class)
    fun handleRoomNotFound(ex: RoomNotFoundException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(error = ex.message ?: "Room not found", code = "ROOM_NOT_FOUND"))
    }

    @ExceptionHandler(RoomNameConflictException::class)
    fun handleRoomNameConflict(ex: RoomNameConflictException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = ex.message ?: "Room name conflict", code = "ROOM_NAME_CONFLICT"))
    }

    @ExceptionHandler(RoomHasInstancesException::class)
    fun handleRoomHasInstances(ex: RoomHasInstancesException): ResponseEntity<RoomHasInstancesResponse> {
        return ResponseEntity
            .status(HttpStatus.OK)
            .body(
                RoomHasInstancesResponse(
                    error = "Room is assigned to scheduled class instances",
                    code = "ROOM_HAS_INSTANCES",
                    affectedInstances = ex.affected
                )
            )
    }

    @ExceptionHandler(ClassTemplateNotFoundException::class)
    fun handleClassTemplateNotFound(ex: ClassTemplateNotFoundException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(error = ex.message ?: "Class template not found", code = "CLASS_TEMPLATE_NOT_FOUND"))
    }

    @ExceptionHandler(ClassTemplateNameConflictException::class)
    fun handleClassTemplateNameConflict(ex: ClassTemplateNameConflictException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = ex.message ?: "Class template name conflict", code = "CLASS_TEMPLATE_NAME_CONFLICT"))
    }

    @ExceptionHandler(ClassTemplateHasInstancesException::class)
    fun handleClassTemplateHasInstances(
        ex: ClassTemplateHasInstancesException
    ): ResponseEntity<TemplateHasInstancesResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(
                TemplateHasInstancesResponse(
                    error = "Class template has scheduled instances",
                    code = "CLASS_TEMPLATE_HAS_INSTANCES",
                    affectedInstances = ex.affected
                )
            )
    }

    @ExceptionHandler(ClassInstanceNotFoundException::class)
    fun handleClassInstanceNotFound(ex: ClassInstanceNotFoundException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(error = ex.message ?: "Class instance not found", code = "CLASS_INSTANCE_NOT_FOUND"))
    }

    @ExceptionHandler(InvalidSlotException::class)
    fun handleInvalidSlot(ex: InvalidSlotException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ErrorResponse(error = ex.message ?: "Invalid scheduled time", code = "VALIDATION_ERROR"))
    }

    @ExceptionHandler(InvalidWeekFormatException::class)
    fun handleInvalidWeekFormat(ex: InvalidWeekFormatException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ErrorResponse(error = ex.message ?: "Invalid week format", code = "VALIDATION_ERROR"))
    }

    @ExceptionHandler(InvalidScheduleViewException::class)
    fun handleInvalidScheduleView(ex: InvalidScheduleViewException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = ex.message ?: "Invalid schedule view", code = "INVALID_SCHEDULE_VIEW"))
    }

    @ExceptionHandler(InvalidAnchorDateException::class)
    fun handleInvalidAnchorDate(ex: InvalidAnchorDateException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = ex.message ?: "Invalid anchor date", code = "INVALID_ANCHOR_DATE"))
    }

    @ExceptionHandler(InvalidTimeZoneException::class)
    fun handleInvalidTimeZone(ex: InvalidTimeZoneException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = ex.message ?: "Invalid time zone", code = "INVALID_TIME_ZONE"))
    }

    @ExceptionHandler(InvalidExportFormatException::class)
    fun handleInvalidExportFormat(ex: InvalidExportFormatException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ErrorResponse(error = ex.message ?: "Invalid export format", code = "VALIDATION_ERROR"))
    }

    @ExceptionHandler(AlreadyFavoritedException::class)
    fun handleAlreadyFavorited(ex: AlreadyFavoritedException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(error = ex.message ?: "Trainer already favorited", code = "ALREADY_FAVORITED"))
    }

    @ExceptionHandler(FavoriteNotFoundException::class)
    fun handleFavoriteNotFound(ex: FavoriteNotFoundException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(error = ex.message ?: "Favorite not found", code = "FAVORITE_NOT_FOUND"))
    }

    @ExceptionHandler(MembershipRequiredException::class)
    fun handleMembershipRequired(ex: MembershipRequiredException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(ErrorResponse(error = ex.message ?: "Active membership required", code = "MEMBERSHIP_REQUIRED"))
    }

    @ExceptionHandler(InvalidSortFieldException::class)
    fun handleInvalidSortField(ex: InvalidSortFieldException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = ex.message ?: "Invalid sort field", code = "INVALID_SORT_FIELD"))
    }

    @ExceptionHandler(ImportFormatInvalidException::class)
    fun handleImportFormatInvalid(ex: ImportFormatInvalidException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error = ex.message ?: "Import format invalid", code = "IMPORT_FORMAT_INVALID"))
    }

    @ExceptionHandler(ImportFileTooLargeException::class)
    fun handleImportFileTooLarge(ex: ImportFileTooLargeException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(ErrorResponse(error = ex.message ?: "Import file too large", code = "IMPORT_FILE_TOO_LARGE"))
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpectedException(ex: Exception): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse(error = "An unexpected error occurred", code = "INTERNAL_ERROR"))
    }
}
