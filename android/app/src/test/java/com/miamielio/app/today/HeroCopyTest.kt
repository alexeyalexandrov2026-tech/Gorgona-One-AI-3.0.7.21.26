package com.miamielio.app.today

import com.miamielio.app.R
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant
import java.util.Locale

class HeroCopyTest {
    @Test
    fun theHintTypesThenHoldsThenMovesOn() {
        val prompts = listOf("Abc", "Xy")
        assertEquals("", ghostText(prompts, 0))
        assertEquals("A", ghostText(prompts, 42))
        assertEquals("Abc", ghostText(prompts, 126))
        assertEquals("Abc", ghostText(prompts, 126 + 1_599))
        assertEquals("", ghostText(prompts, 126 + 1_600))
        assertEquals("X", ghostText(prompts, 126 + 1_600 + 42))
        val cycle = 126 + 1_600 + 84 + 1_600L
        assertEquals("A", ghostText(prompts, cycle + 42))
    }

    @Test
    fun noPromptsMeansNoHint() {
        assertEquals("", ghostText(emptyList(), 5_000))
    }

    @Test
    fun theClockShowsMiamiTime() {
        val text = miamiClock(Instant.parse("2026-11-19T00:34:00Z"), Locale.US)
        assertEquals("7:34 PM", text.replace(' ', ' '))
    }

    @Test
    fun picksAskWhatTheSiteAsks() {
        assertEquals(
            listOf(
                R.string.home_chip_1, R.string.home_chip_4, R.string.home_chip_2, R.string.home_ask_jets,
                R.string.home_chip_5, R.string.home_chip_3, R.string.home_ask_adventures,
            ),
            PICKS.map { it.ask },
        )
    }
}
