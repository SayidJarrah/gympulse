package com.gymflow.service

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.temporal.IsoFields
import java.time.temporal.TemporalAdjusters

object ScheduleWeekParser {
    fun parseWeek(week: String): WeekRange {
        val parts = week.split("-W")
        if (parts.size != 2) throw InvalidWeekFormatException("Invalid week format")

        val year = parts[0].toIntOrNull() ?: throw InvalidWeekFormatException("Invalid week format")
        val weekOfYear = parts[1].toIntOrNull() ?: throw InvalidWeekFormatException("Invalid week format")

        val base = LocalDate.of(year, 1, 4)
        val monday = base
            .with(IsoFields.WEEK_OF_WEEK_BASED_YEAR, weekOfYear.toLong())
            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

        val actualWeek = monday.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
        val actualYear = monday.get(IsoFields.WEEK_BASED_YEAR)
        if (actualWeek != weekOfYear || actualYear != year) {
            throw InvalidWeekFormatException("Invalid week format")
        }

        val normalized = String.format("%04d-W%02d", year, weekOfYear)
        val start = monday.atStartOfDay().atOffset(ZoneOffset.UTC)
        val end = start.plusDays(7)

        return WeekRange(normalized, start, end)
    }

    fun nextWeek(weekRange: WeekRange): WeekRange {
        val nextMonday = weekRange.start.toLocalDate().plusWeeks(1)
        val nextWeek = nextMonday.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
        val nextYear = nextMonday.get(IsoFields.WEEK_BASED_YEAR)
        val normalized = String.format("%04d-W%02d", nextYear, nextWeek)
        return parseWeek(normalized)
    }
}

data class WeekRange(
    val week: String,
    val start: OffsetDateTime,
    val end: OffsetDateTime
)

class InvalidWeekFormatException(message: String) : RuntimeException(message)
