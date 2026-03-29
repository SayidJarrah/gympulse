package com.gymflow.repository

import com.gymflow.domain.ClassTemplate
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ClassTemplateRepository : JpaRepository<ClassTemplate, UUID> {
    fun findByNameContainingIgnoreCase(name: String, pageable: Pageable): Page<ClassTemplate>

    fun findByCategory(category: String, pageable: Pageable): Page<ClassTemplate>

    fun findByCategoryAndNameContainingIgnoreCase(category: String, name: String, pageable: Pageable): Page<ClassTemplate>

    fun findByName(name: String): ClassTemplate?

    fun findByNameIgnoreCaseAndIdNot(name: String, id: UUID): ClassTemplate?
}
