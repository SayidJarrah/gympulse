package com.gymflow.dto

import com.fasterxml.jackson.annotation.JsonTypeInfo
import com.fasterxml.jackson.annotation.JsonSubTypes
import java.time.OffsetDateTime
import java.util.UUID

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.EXISTING_PROPERTY, property = "state", visible = true)
@JsonSubTypes(
    JsonSubTypes.Type(value = LoggedOutStateResponse::class, name = "loggedOut"),
    JsonSubTypes.Type(value = BookedStateResponse::class, name = "booked"),
    JsonSubTypes.Type(value = NoBookedStateResponse::class, name = "nobooked")
)
sealed class LandingViewerStateResponse {
    abstract val state: String
}

data class LoggedOutStateResponse(
    override val state: String = "loggedOut"
) : LandingViewerStateResponse()

data class BookedStateResponse(
    override val state: String = "booked",
    val firstName: String,
    val onTheFloor: Int,
    val upcomingClass: UpcomingClassDto
) : LandingViewerStateResponse()

data class NoBookedStateResponse(
    override val state: String = "nobooked",
    val firstName: String,
    val onTheFloor: Int,
    val nextOpenClass: NextOpenClassDto?
) : LandingViewerStateResponse()

data class UpcomingClassDto(
    val id: UUID,
    val name: String,
    val startsAt: OffsetDateTime,
    val trainer: TrainerRefDto,
    val studio: String,
    val durationMin: Int
)

data class NextOpenClassDto(
    val id: UUID,
    val name: String,
    val startsIn: String,
    val startsAt: OffsetDateTime,
    val trainer: TrainerRefDto,
    val studio: String,
    val spotsLeft: Int,
    val remainingClassesToday: Int
)

data class TrainerRefDto(
    val id: UUID?,
    val name: String,
    val avatarUrl: String?
)
