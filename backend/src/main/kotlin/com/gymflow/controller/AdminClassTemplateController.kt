package com.gymflow.controller

import com.gymflow.dto.ClassTemplateRequest
import com.gymflow.dto.ClassTemplateResponse
import com.gymflow.service.ClassTemplateService
import jakarta.validation.Valid
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/admin/class-templates")
@PreAuthorize("hasRole('ADMIN')")
class AdminClassTemplateController(
    private val classTemplateService: ClassTemplateService
) {

    @GetMapping
    fun listTemplates(
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) category: String?,
        @PageableDefault(size = 20, sort = ["name"]) pageable: Pageable
    ): ResponseEntity<Page<ClassTemplateResponse>> {
        return ResponseEntity.ok(classTemplateService.getTemplates(search, category, pageable))
    }

    @PostMapping
    fun createTemplate(@Valid @org.springframework.web.bind.annotation.RequestBody request: ClassTemplateRequest): ResponseEntity<ClassTemplateResponse> {
        val created = classTemplateService.createTemplate(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @PutMapping("/{id}")
    fun updateTemplate(
        @PathVariable id: UUID,
        @Valid @org.springframework.web.bind.annotation.RequestBody request: ClassTemplateRequest
    ): ResponseEntity<ClassTemplateResponse> {
        return ResponseEntity.ok(classTemplateService.updateTemplate(id, request))
    }

    @DeleteMapping("/{id}")
    fun deleteTemplate(
        @PathVariable id: UUID,
        @RequestParam(required = false, defaultValue = "false") force: Boolean
    ): ResponseEntity<Void> {
        classTemplateService.deleteTemplate(id, force)
        return ResponseEntity.noContent().build()
    }
}
