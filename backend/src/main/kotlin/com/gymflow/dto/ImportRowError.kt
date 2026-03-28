package com.gymflow.dto

data class ImportRowError(
    val row: Int,
    val reason: String,
    val detail: String
)
