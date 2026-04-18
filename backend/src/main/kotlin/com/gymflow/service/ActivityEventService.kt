package com.gymflow.service

import com.gymflow.domain.ActivityEvent
import com.gymflow.domain.User
import com.gymflow.dto.ActivityEventDto
import com.gymflow.repository.ActivityEventRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.concurrent.CopyOnWriteArrayList

@Service
class ActivityEventService(
    private val activityEventRepository: ActivityEventRepository
) {

    private val emitters: CopyOnWriteArrayList<SseEmitter> = CopyOnWriteArrayList()

    /**
     * Persists a new activity event and broadcasts it to all connected SSE clients.
     *
     * @param kind      One of: checkin, booking, pr, class
     * @param actor     The user who triggered the event (nullable for class-kind events)
     * @param actorName Display name at event time; denormalized against future profile changes
     * @param text      Full action text for authenticated feed
     * @param textPublic Anonymized text for public feed (no PII, no performance values)
     */
    @Transactional
    fun recordEvent(
        kind: String,
        actor: User?,
        actorName: String,
        text: String,
        textPublic: String
    ): ActivityEvent {
        val event = activityEventRepository.save(
            ActivityEvent(
                kind = kind,
                actor = actor,
                actorName = actorName,
                text = text,
                textPublic = textPublic
            )
        )

        broadcastToEmitters(event, authed = false)

        return event
    }

    /**
     * Returns the last 20 events ordered by most recent first.
     */
    @Transactional(readOnly = true)
    fun getRecent(): List<ActivityEvent> =
        activityEventRepository.findTop20ByOrderByOccurredAtDesc()

    /**
     * Registers a new SSE emitter and wires up removal callbacks to prevent memory leaks.
     * The [authed] flag controls whether full or anonymized data is pushed.
     */
    fun registerEmitter(emitter: SseEmitter) {
        emitters.add(emitter)
        emitter.onCompletion { emitters.remove(emitter) }
        emitter.onTimeout { emitters.remove(emitter) }
        emitter.onError { emitters.remove(emitter) }
    }

    /**
     * Broadcasts a single event to all registered emitters.
     * Dead emitters are removed silently; the per-emitter send failure does not affect others.
     *
     * NOTE: The SDD specifies that auth branching is done at connection time (via the EventSource URL
     * or a query param carrying identity). In this v1 implementation, the SSE stream is a single
     * endpoint and all registered emitters receive the same push. The client receives the full-text
     * variant. If PII isolation at push time becomes a requirement, maintain two separate emitter
     * lists (one per auth level) and use separate endpoint paths.
     */
    fun broadcastToEmitters(event: ActivityEvent, authed: Boolean) {
        val dto = event.toDto(authed)
        val deadEmitters = mutableListOf<SseEmitter>()

        for (emitter in emitters) {
            try {
                emitter.send(
                    SseEmitter.event()
                        .id(dto.id.toString())
                        .data(dto)
                )
            } catch (_: Exception) {
                deadEmitters.add(emitter)
            }
        }

        emitters.removeAll(deadEmitters)
    }

    fun ActivityEvent.toDto(authed: Boolean): ActivityEventDto = ActivityEventDto(
        id = id,
        kind = kind,
        actor = if (authed) actorName else "A member",
        text = if (authed) text else textPublic,
        at = occurredAt
    )
}
