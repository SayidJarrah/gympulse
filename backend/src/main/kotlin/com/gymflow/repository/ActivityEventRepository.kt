package com.gymflow.repository

import com.gymflow.domain.ActivityEvent
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ActivityEventRepository : JpaRepository<ActivityEvent, UUID> {

    fun findTop20ByOrderByOccurredAtDesc(): List<ActivityEvent>
}
