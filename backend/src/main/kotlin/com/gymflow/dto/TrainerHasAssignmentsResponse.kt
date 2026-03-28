package com.gymflow.dto

data class TrainerHasAssignmentsResponse(
    val error: String,
    val code: String,
    val affectedInstances: List<AffectedInstanceResponse>
)
