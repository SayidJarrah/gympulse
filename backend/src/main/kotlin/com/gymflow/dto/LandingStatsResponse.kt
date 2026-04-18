package com.gymflow.dto

import com.fasterxml.jackson.annotation.JsonTypeInfo
import com.fasterxml.jackson.annotation.JsonSubTypes

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.EXISTING_PROPERTY, property = "variant", visible = true)
@JsonSubTypes(
    JsonSubTypes.Type(value = AuthedStatsResponse::class, name = "authed"),
    JsonSubTypes.Type(value = PublicStatsResponse::class, name = "public")
)
sealed class LandingStatsResponse {
    abstract val variant: String
}

data class AuthedStatsResponse(
    override val variant: String = "authed",
    val onTheFloor: Int,
    val classesToday: Int,
    val tightestClass: TightestClassDto?
) : LandingStatsResponse()

data class PublicStatsResponse(
    override val variant: String = "public",
    val memberCount: Long,
    val classesToday: Int,
    val coachCount: Long
) : LandingStatsResponse()

data class TightestClassDto(
    val name: String,
    val spotsLeft: Int
)
