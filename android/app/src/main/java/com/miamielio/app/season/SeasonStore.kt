package com.miamielio.app.season

import com.miamielio.app.core.Season
import com.miamielio.app.core.SeasonEvent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.time.Instant

/** The phone's side of a reminder: an alarm that survives the app being closed. */
interface ReminderScheduler {
    /** Event id -> when its reminder comes, for everything still scheduled. */
    fun scheduled(): Map<String, Instant>

    fun schedule(event: SeasonEvent, at: Instant)

    fun cancel(eventId: String)

    /** False when the guest has turned notifications off for the app. */
    fun notificationsAllowed(): Boolean

    /** True once the guest has been asked for notifications and said no. */
    var refused: Boolean
}

data class SeasonState(
    /** Event id -> when its reminder comes. */
    val reminders: Map<String, Instant> = emptyMap(),
    /** The guest has turned notifications off for the app. */
    val blocked: Boolean = false,
)

/**
 * Miami's season on the concierge screen, and the reminders a guest asks
 * for. A reminder is a notification the phone itself delivers at the time
 * it was given: nothing comes from a server, and nothing is scheduled (or
 * asked permission for) until the guest taps the bell.
 */
class SeasonStore(
    val events: List<SeasonEvent>,
    private val scheduler: ReminderScheduler,
    private val clock: () -> Instant = Instant::now,
) {
    private val mutableState = MutableStateFlow(SeasonState())
    val state: StateFlow<SeasonState> = mutableState.asStateFlow()

    fun now(): Instant = clock()

    fun upcoming(): List<SeasonEvent> = Season.upcoming(events, clock())

    fun event(id: String): SeasonEvent? = events.firstOrNull { it.id == id }

    /**
     * Reads back what is still scheduled: a reminder that has gone off, or
     * notifications turned off in Settings, show up here.
     */
    fun refresh() {
        val allowed = scheduler.notificationsAllowed()
        if (allowed) scheduler.refused = false
        mutableState.value = SeasonState(
            reminders = scheduler.scheduled(),
            blocked = !allowed && scheduler.refused,
        )
    }

    fun notificationsAllowed(): Boolean = scheduler.notificationsAllowed()

    fun hasReminder(event: SeasonEvent): Boolean = event.id in mutableState.value.reminders

    /** True when the bell has something to offer: a reminder to set, or one to take back. */
    fun canRemind(event: SeasonEvent): Boolean =
        hasReminder(event) || Season.reminder(event, clock()) != null

    fun cancel(event: SeasonEvent) {
        scheduler.cancel(event.id)
        refresh()
    }

    /** Schedules the week's reminder. Call once the guest has allowed notifications. */
    fun remind(event: SeasonEvent) {
        val at = Season.reminder(event, clock()) ?: return
        scheduler.refused = false
        scheduler.schedule(event, at)
        refresh()
    }

    /** The guest was asked for notifications and said no. */
    fun refused() {
        scheduler.refused = true
        refresh()
    }
}
