package com.gymflow.dto

data class RoomHasInstancesResponse(
    val error: String,
    val code: String,
    val affectedInstances: List<AffectedInstanceResponse>
)
