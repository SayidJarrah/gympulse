package com.gymflow.dto

data class TemplateHasInstancesResponse(
    val error: String,
    val code: String,
    val affectedInstances: List<AffectedInstanceResponse>
)
