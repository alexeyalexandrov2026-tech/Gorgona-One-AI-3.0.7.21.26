package com.miamielio.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import java.time.Instant

class SeasonTest {
    private val basel = SeasonEvent("art-basel", "Art Basel Miami Beach", "2026-12-04", "2026-12-06", "Miami Beach Convention Center", "VIP days start Dec 2.")
    private val newYear = SeasonEvent("nye", "New Year’s Eve", "2026-12-31", "2026-12-31", "Biscayne Bay", "Fireworks over the bay.")
    private val race = SeasonEvent("f1", "Formula 1 Miami Grand Prix", "2027-04-30", "2027-05-02", "Miami International Autodrome", "Race weekend.")

    private fun utc(text: String): Instant = Instant.parse(text)

    @Test
    fun readsTheFileTheScriptWrites() {
        val json = """{"checked":"2026-10-02","events":[{"id":"nye","name":"New Year’s Eve","start":"2026-12-31","end":"2026-12-31","place":"Biscayne Bay","tip":"Fireworks over the bay."}]}"""
        assertEquals(listOf(newYear), Season.decode(json))
        assertThrows(ApiError::class.java) { Season.decode("[]") }
        assertThrows(ApiError::class.java) { Season.decode("{}") }
    }

    @Test
    fun keepsTheWeeksThatHaveNotEndedSoonestFirst() {
        val all = listOf(race, newYear, basel)
        assertEquals(listOf("art-basel", "nye", "f1"), Season.upcoming(all, utc("2026-11-11T17:00:00Z")).map { it.id })
        // Its last day still counts, on Miami's calendar: 10 p.m. in Miami
        // is already the next day in London.
        assertEquals(listOf("art-basel", "nye", "f1"), Season.upcoming(all, utc("2026-12-07T03:00:00Z")).map { it.id })
        assertEquals(listOf("nye", "f1"), Season.upcoming(all, utc("2026-12-07T06:00:00Z")).map { it.id })
        assertEquals(emptyList<SeasonEvent>(), Season.upcoming(all, utc("2027-05-03T12:00:00Z")))
    }

    @Test
    fun countsDaysOnMiamisCalendar() {
        assertEquals(23, Season.daysUntil(basel, utc("2026-11-11T17:00:00Z")))
        assertEquals(1, Season.daysUntil(basel, utc("2026-12-03T17:00:00Z")))
        assertEquals(0, Season.daysUntil(basel, utc("2026-12-04T17:00:00Z")))
        assertEquals(-1, Season.daysUntil(basel, utc("2026-12-05T17:00:00Z")))
    }

    @Test
    fun remindsThreeWeeksAheadAtTenInMiami() {
        // Ten in the morning in Miami is 15:00 UTC in winter...
        assertEquals(utc("2026-11-13T15:00:00Z"), Season.reminder(basel, utc("2026-11-11T17:00:00Z")))
        // ...and 14:00 UTC once the clocks have gone forward.
        assertEquals(utc("2027-04-09T14:00:00Z"), Season.reminder(race, utc("2026-11-11T17:00:00Z")))
    }

    @Test
    fun remindsTheNextMorningOnceThreeWeeksHavePassed() {
        // 3 p.m. in Miami: tomorrow at ten.
        assertEquals(utc("2026-11-21T15:00:00Z"), Season.reminder(basel, utc("2026-11-20T20:00:00Z")))
        // 8 a.m. in Miami: today at ten.
        assertEquals(utc("2026-11-20T15:00:00Z"), Season.reminder(basel, utc("2026-11-20T13:00:00Z")))
        // The morning before it starts is still worth a reminder...
        assertEquals(utc("2026-12-03T15:00:00Z"), Season.reminder(basel, utc("2026-12-03T12:00:00Z")))
        // ...the morning it starts, or later, is not.
        assertNull(Season.reminder(basel, utc("2026-12-03T18:00:00Z")))
        assertNull(Season.reminder(basel, utc("2026-12-05T12:00:00Z")))
    }

    @Test
    fun printsDatesTheWayTheSiteDoes() {
        assertEquals("Dec 4 – 6", Season.range(basel))
        assertEquals("Dec 31", Season.range(newYear))
        assertEquals("Apr 30 – May 2", Season.range(race))
        assertEquals("DEC", Season.monthStub(basel))
        assertEquals("4", Season.dayStub(basel))

        val broken = SeasonEvent("x", "X", "soon", "later", "", "")
        assertEquals("soon", Season.range(broken))
        assertNull(Season.reminder(broken, utc("2026-11-11T17:00:00Z")))
        assertEquals(emptyList<SeasonEvent>(), Season.upcoming(listOf(broken), utc("2026-11-11T17:00:00Z")))
    }
}
