package com.gymflow.service

import com.gymflow.domain.ClassInstance
import com.gymflow.dto.ImportResultResponse
import com.gymflow.dto.ImportRowError
import com.gymflow.repository.ClassInstanceRepository
import com.gymflow.repository.ClassTemplateRepository
import com.gymflow.repository.RoomRepository
import com.gymflow.repository.TrainerRepository
import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVParser
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.io.InputStreamReader
import java.time.LocalDate
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Service
@Transactional
class ScheduleImportService(
    private val classInstanceRepository: ClassInstanceRepository,
    private val trainerRepository: TrainerRepository,
    private val roomRepository: RoomRepository,
    private val classTemplateRepository: ClassTemplateRepository
) {

    fun importSchedule(file: MultipartFile): ImportResultResponse {
        if (file.size > MAX_IMPORT_SIZE_BYTES) {
            throw ImportFileTooLargeException("Import file exceeds size limit")
        }

        val contentType = file.contentType ?: ""
        if (contentType != "text/csv") {
            throw ImportFormatInvalidException("Invalid import file format")
        }

        val errors = mutableListOf<ImportRowError>()
        val instances = mutableListOf<ClassInstance>()

        CSVParser(
            InputStreamReader(file.inputStream),
            CSVFormat.DEFAULT.withFirstRecordAsHeader().withTrim()
        ).use { parser ->
            val headers = parser.headerMap.keys
            if (!REQUIRED_HEADERS.all { headers.contains(it) }) {
                throw ImportFormatInvalidException("Missing required CSV headers")
            }

            parser.forEach { record ->
                val rowNumber = record.recordNumber.toInt() + 1
                val result = parseRow(record.toMap(), rowNumber)
                if (result.error != null) {
                    errors.add(result.error)
                } else if (result.instance != null) {
                    instances.add(result.instance)
                }
            }
        }

        if (instances.isNotEmpty()) {
            classInstanceRepository.saveAll(instances)
        }

        return ImportResultResponse(
            imported = instances.size,
            rejected = errors.size,
            errors = errors
        )
    }

    private fun parseRow(row: Map<String, String>, rowNumber: Int): RowResult {
        val className = row["class_name"].orEmpty().trim()
        if (className.isBlank()) {
            return RowResult.error(rowNumber, "VALIDATION_ERROR", "class_name is required")
        }

        val dateValue = row["date"].orEmpty().trim()
        val date = try {
            LocalDate.parse(dateValue)
        } catch (ex: Exception) {
            return RowResult.error(rowNumber, "VALIDATION_ERROR", "date must be ISO format YYYY-MM-DD")
        }

        val timeValue = row["start_time"].orEmpty().trim()
        val time = try {
            LocalTime.parse(timeValue)
        } catch (ex: Exception) {
            return RowResult.error(rowNumber, "VALIDATION_ERROR", "start_time must be HH:MM")
        }

        if (time.minute !in setOf(0, 30)) {
            return RowResult.error(rowNumber, "VALIDATION_ERROR", "start_time must be on a 30-minute boundary")
        }

        val durationValue = row["duration_minutes"].orEmpty().trim()
        val duration = durationValue.toIntOrNull()
            ?: return RowResult.error(rowNumber, "VALIDATION_ERROR", "duration_minutes must be a number")
        if (duration < 15 || duration > 240) {
            return RowResult.error(rowNumber, "VALIDATION_ERROR", "duration_minutes must be between 15 and 240")
        }

        val capacityValue = row["capacity"].orEmpty().trim()
        val capacity = capacityValue.toIntOrNull()
            ?: return RowResult.error(rowNumber, "VALIDATION_ERROR", "capacity must be a number")
        if (capacity < 1 || capacity > 500) {
            return RowResult.error(rowNumber, "VALIDATION_ERROR", "capacity must be between 1 and 500")
        }

        val trainerEmail = row["trainer_email"].orEmpty().trim()
        val trainer = if (trainerEmail.isNotBlank()) {
            trainerRepository.findByEmail(trainerEmail)
                ?: return RowResult.error(rowNumber, "TRAINER_NOT_FOUND", "trainer_email '$trainerEmail' not found")
        } else {
            null
        }

        val roomName = row["room"].orEmpty().trim()
        val room = if (roomName.isNotBlank()) {
            roomRepository.findByNameIgnoreCase(roomName)
                ?: return RowResult.error(rowNumber, "ROOM_NOT_FOUND", "room '$roomName' not found")
        } else {
            null
        }

        val scheduledAt = OffsetDateTime.of(date, time, ZoneOffset.UTC)

        if (trainer != null) {
            val endTime = scheduledAt.plusMinutes(duration.toLong())
            val conflicts = classInstanceRepository.findTrainerOverlaps(trainer.id, scheduledAt, endTime)
            if (conflicts.isNotEmpty()) {
                return RowResult.error(
                    rowNumber,
                    "TRAINER_SCHEDULE_CONFLICT",
                    "Trainer ${trainer.firstName} ${trainer.lastName} already assigned at ${timeValue}"
                )
            }
        }

        val template = classTemplateRepository.findByName(className)

        val instance = ClassInstance(
            template = template,
            name = className,
            scheduledAt = scheduledAt,
            durationMin = duration,
            capacity = capacity,
            room = room,
            trainers = trainer?.let { mutableSetOf(it) } ?: mutableSetOf(),
            type = "GROUP"
        )

        return RowResult(instance, null)
    }

    private data class RowResult(val instance: ClassInstance?, val error: ImportRowError?) {
        companion object {
            fun error(row: Int, reason: String, detail: String) = RowResult(
                instance = null,
                error = ImportRowError(row = row, reason = reason, detail = detail)
            )
        }
    }

    companion object {
        private const val MAX_IMPORT_SIZE_BYTES = 2L * 1024 * 1024
        private val REQUIRED_HEADERS = setOf(
            "class_name",
            "date",
            "start_time",
            "duration_minutes",
            "capacity"
        )
    }
}

class ImportFormatInvalidException(message: String) : RuntimeException(message)
class ImportFileTooLargeException(message: String) : RuntimeException(message)
