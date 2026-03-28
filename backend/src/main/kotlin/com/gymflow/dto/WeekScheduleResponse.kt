package com.gymflow.dto

data class WeekScheduleResponse(
    val week: String,
    val instances: List<ClassInstanceResponse>
)
