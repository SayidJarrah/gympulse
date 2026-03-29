package com.gymflow.dto

data class CopyWeekResponse(
    val copied: Int,
    val skipped: Int,
    val targetWeek: String
)
