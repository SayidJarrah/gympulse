package com.gymflow.service

import com.gymflow.repository.ClassInstanceRepository
import net.fortuna.ical4j.model.Calendar
import net.fortuna.ical4j.model.DateTime
import net.fortuna.ical4j.model.component.VEvent
import net.fortuna.ical4j.model.property.CalScale
import net.fortuna.ical4j.model.property.Description
import net.fortuna.ical4j.model.property.Location
import net.fortuna.ical4j.model.property.ProdId
import net.fortuna.ical4j.model.property.Uid
import net.fortuna.ical4j.model.property.Version
import net.fortuna.ical4j.model.property.Summary
import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVPrinter
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.StringWriter
import java.time.format.DateTimeFormatter
import java.util.Date

@Service
@Transactional(readOnly = true)
class ScheduleExportService(
    private val classInstanceRepository: ClassInstanceRepository
) {

    fun exportCsv(week: String): ByteArray {
        val range = ScheduleWeekParser.parseWeek(week)
        val instances = classInstanceRepository.findWithDetailsBetween(range.start, range.end)

        val writer = StringWriter()
        val printer = CSVPrinter(
            writer,
            CSVFormat.DEFAULT.withHeader(
                "class_name",
                "date",
                "start_time",
                "duration_minutes",
                "capacity",
                "trainer_email",
                "room"
            )
        )

        instances.forEach { instance ->
            val date = instance.scheduledAt.toLocalDate().toString()
            val time = instance.scheduledAt.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"))
            val roomName = instance.room?.name.orEmpty()

            if (instance.trainers.isEmpty()) {
                printer.printRecord(
                    instance.name,
                    date,
                    time,
                    instance.durationMin,
                    instance.capacity,
                    "",
                    roomName
                )
            } else {
                instance.trainers.forEach { trainer ->
                    printer.printRecord(
                        instance.name,
                        date,
                        time,
                        instance.durationMin,
                        instance.capacity,
                        trainer.email,
                        roomName
                    )
                }
            }
        }

        printer.flush()
        return writer.toString().toByteArray(Charsets.UTF_8)
    }

    fun exportIcal(week: String): ByteArray {
        val range = ScheduleWeekParser.parseWeek(week)
        val instances = classInstanceRepository.findWithDetailsBetween(range.start, range.end)

        val calendar = Calendar()
        calendar.properties.add(ProdId("-//GymFlow//Scheduler//EN"))
        calendar.properties.add(Version.VERSION_2_0)
        calendar.properties.add(CalScale.GREGORIAN)

        instances.forEach { instance ->
            val start = DateTime(Date.from(instance.scheduledAt.toInstant())).apply { setUtc(true) }
            val end = DateTime(Date.from(instance.scheduledAt.plusMinutes(instance.durationMin.toLong()).toInstant()))
                .apply { setUtc(true) }

            val event = VEvent(start, end, instance.name)
            event.properties.add(Uid("${instance.id}@gymflow"))
            event.properties.add(Summary(instance.name))

            val trainerNames = instance.trainers.joinToString(", ") { "${it.firstName} ${it.lastName}" }
            val templateDescription = instance.template?.description
            val descriptionValue = listOfNotNull(
                trainerNames.takeIf { it.isNotBlank() },
                templateDescription?.takeIf { it.isNotBlank() }
            ).joinToString("; ")

            if (descriptionValue.isNotBlank()) {
                event.properties.add(Description(descriptionValue))
            }

            instance.room?.name?.let { roomName ->
                if (roomName.isNotBlank()) {
                    event.properties.add(Location(roomName))
                }
            }

            calendar.components.add(event)
        }

        return calendar.toString().toByteArray(Charsets.UTF_8)
    }
}
