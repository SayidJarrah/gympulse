package com.gymflow.controller

import com.gymflow.dto.ClassInstancePatchRequest
import com.gymflow.dto.ClassInstanceRequest
import com.gymflow.dto.ClassInstanceResponse
import com.gymflow.dto.CopyWeekRequest
import com.gymflow.dto.CopyWeekResponse
import com.gymflow.dto.WeekScheduleResponse
import com.gymflow.service.ClassInstanceService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/admin/class-instances")
@PreAuthorize("hasRole('ADMIN')")
class AdminClassInstanceController(
    private val classInstanceService: ClassInstanceService
) {

    @GetMapping
    fun listWeek(@RequestParam week: String): ResponseEntity<WeekScheduleResponse> {
        return ResponseEntity.ok(classInstanceService.getWeekSchedule(week))
    }

    @GetMapping("/{id}")
    fun getInstance(@PathVariable id: UUID): ResponseEntity<ClassInstanceResponse> {
        return ResponseEntity.ok(classInstanceService.getInstance(id))
    }

    @PostMapping
    fun createInstance(@Valid @RequestBody request: ClassInstanceRequest): ResponseEntity<ClassInstanceResponse> {
        val created = classInstanceService.createInstance(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @PatchMapping("/{id}")
    fun updateInstance(
        @PathVariable id: UUID,
        @Valid @RequestBody request: ClassInstancePatchRequest
    ): ResponseEntity<ClassInstanceResponse> {
        return ResponseEntity.ok(classInstanceService.updateInstance(id, request))
    }

    @DeleteMapping("/{id}")
    fun deleteInstance(@PathVariable id: UUID): ResponseEntity<Void> {
        classInstanceService.deleteInstance(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/copy-week")
    fun copyWeek(@Valid @RequestBody request: CopyWeekRequest): ResponseEntity<CopyWeekResponse> {
        return ResponseEntity.ok(classInstanceService.copyWeek(request.sourceWeek!!))
    }
}
