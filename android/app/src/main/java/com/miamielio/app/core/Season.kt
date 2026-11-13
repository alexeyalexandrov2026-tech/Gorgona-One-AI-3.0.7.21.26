package com.miamielio.app.core

import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * One of the weeks in Miami that sell out first: Art Basel, New Year's Eve,
 * the Boat Show and the rest. The list is the website's own
 * (`lib/seasonData.js`), copied into the app as `season.json` by
 * `android/scripts/build-season.mjs`. Event records stay in English in every
 * language, as they do on the site.
 */
data class SeasonEvent(
    val id: String,
    val name: String,
    /** Calendar days in Miami, "2026-12-04". */
    val start: String,
    val end: String,
    val place: String,
    val tip: String,
)

/**
 * What to show of the season and when to remind a guest about a week.
 * Days are counted on Miami's calendar wherever the guest's phone is.
 */
object Season {
    val zone: ZoneId = ZoneId.of("America/New_York")

    /** A reminder comes three weeks ahead: early enough to book what goes first. */
    const val reminderLead = 21L

    /** At ten in the morning, Miami time. */
    const val reminderHour = 10

    /** Reads `season.json`. Throws when the file is not what it should be. */
    fun decode(json: String): List<SeasonEvent> {
        val root = Decode.obj(json.toByteArray(Charsets.UTF_8)) ?: throw ApiError.Decoding
        if (!root.containsKey("events")) throw ApiError.Decoding
        return root.lossyArray("events") { event ->
            SeasonEvent(
                id = event.text("id") ?: return@lossyArray null,
                name = event.text("name") ?: return@lossyArray null,
                start = event.text("start") ?: return@lossyArray null,
                end = event.text("end") ?: return@lossyArray null,
                place = event.text("place").orEmpty(),
                tip = event.text("tip").orEmpty(),
            )
        }
    }

    /** The weeks that have not ended yet, soonest first. */
    fun upcoming(events: List<SeasonEvent>, now: Instant): List<SeasonEvent> {
        val today = today(now)
        return events
            .filter { event -> day(event.end)?.let { !it.isBefore(today) } ?: false }
            .sortedBy { it.start }
    }

    /** Whole days from today until the week starts; 0 or less while it is on. */
    fun daysUntil(event: SeasonEvent, now: Instant): Int {
        val start = day(event.start) ?: return 0
        return ChronoUnit.DAYS.between(today(now), start).toInt()
    }

    /**
     * When to remind a guest who asks now, or null when it is too late to be
     * worth it. Normally three weeks ahead; once that has passed, the next
     * morning, as long as that is still before the week begins.
     */
    fun reminder(event: SeasonEvent, now: Instant): Instant? {
        val start = day(event.start) ?: return null
        val planned = morning(start.minusDays(reminderLead))
        if (planned.isAfter(now)) return planned
        val todayMorning = morning(today(now))
        val next = if (todayMorning.isAfter(now)) todayMorning else morning(today(now).plusDays(1))
        return next.takeIf { it.isBefore(start.atStartOfDay(zone).toInstant()) }
    }

    /**
     * "Dec 4 – 6", "Dec 31", "Apr 30 – May 2": the dates the way the site
     * prints them for an event (in English, like the event's name).
     */
    fun range(event: SeasonEvent): String {
        val start = day(event.start) ?: return event.start
        val end = day(event.end) ?: return event.start
        val first = "${monthName(start.monthValue)} ${start.dayOfMonth}"
        if (start == end) return first
        if (start.monthValue == end.monthValue && start.year == end.year) {
            return "$first – ${end.dayOfMonth}"
        }
        return "$first – ${monthName(end.monthValue)} ${end.dayOfMonth}"
    }

    /** The month on the date stub: "DEC". */
    fun monthStub(event: SeasonEvent): String =
        day(event.start)?.let { monthName(it.monthValue).uppercase() }.orEmpty()

    /** The day on the date stub: "4". */
    fun dayStub(event: SeasonEvent): String =
        day(event.start)?.dayOfMonth?.toString().orEmpty()

    private val months = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

    private fun monthName(month: Int): String = months.getOrElse(month - 1) { "" }

    private fun today(now: Instant): LocalDate = now.atZone(zone).toLocalDate()

    /** An ISO day on Miami's calendar. */
    internal fun day(iso: String): LocalDate? {
        val numbers = iso.split('-').mapNotNull { it.toIntOrNull() }
        if (numbers.size != 3 || numbers[1] !in 1..12 || numbers[2] !in 1..31) return null
        return try {
            LocalDate.of(numbers[0], numbers[1], numbers[2])
        } catch (_: Exception) {
            null
        }
    }

    private fun morning(day: LocalDate): Instant =
        day.atTime(LocalTime.of(reminderHour, 0)).atZone(zone).toInstant()
}
