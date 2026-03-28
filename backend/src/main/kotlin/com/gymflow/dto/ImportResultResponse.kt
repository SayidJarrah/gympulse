package com.gymflow.dto

data class ImportResultResponse(
    val imported: Int,
    val rejected: Int,
    val errors: List<ImportRowError>
)
