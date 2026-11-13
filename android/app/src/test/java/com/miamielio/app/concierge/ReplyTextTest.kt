package com.miamielio.app.concierge

import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReplyTextTest {
    private val opened = mutableListOf<String>()
    private fun parse(text: String) = ReplyText.annotated(text, SpanStyle(), onLink = { opened += it })

    @Test
    fun plainTextStaysAsItIs() {
        val text = "Book by Friday: 2 * 3 = 6, snake_case_name and a lone _ stay."
        val parsed = parse(text)
        assertEquals(text, parsed.text)
        assertTrue(parsed.spanStyles.isEmpty())
    }

    @Test
    fun boldItalicsAndCodeBecomeFormatting() {
        val parsed = parse("**Komodo** is *busy*; __book__ early, _really_. Use `MIAMI10`.")
        assertEquals("Komodo is busy; book early, really. Use MIAMI10.", parsed.text)
        val styles = parsed.spanStyles.map { parsed.text.substring(it.start, it.end) to it.item }
        assertEquals(
            listOf(
                "Komodo" to SpanStyle(fontWeight = FontWeight.SemiBold),
                "busy" to SpanStyle(fontStyle = FontStyle.Italic),
                "book" to SpanStyle(fontWeight = FontWeight.SemiBold),
                "really" to SpanStyle(fontStyle = FontStyle.Italic),
                "MIAMI10" to SpanStyle(fontFamily = FontFamily.Monospace),
            ),
            styles,
        )
    }

    @Test
    fun aLinkKeepsItsLabelAndGoesThroughTheApp() {
        val parsed = parse("See [our **yachts**](/yachts) or [Komodo](https://gorgona-one.com/restaurants-nightlife/komodo-miami).")
        assertEquals("See our yachts or Komodo.", parsed.text)
        val links = parsed.getLinkAnnotations(0, parsed.length)
        assertEquals(listOf("our yachts", "Komodo"), links.map { parsed.text.substring(it.start, it.end) })
        links.forEach { range ->
            val link = range.item as LinkAnnotation.Clickable
            link.linkInteractionListener!!.onClick(link)
        }
        assertEquals(listOf("/yachts", "https://gorgona-one.com/restaurants-nightlife/komodo-miami"), opened)
        // Bold inside a link label still counts.
        assertEquals(listOf("yachts"), parsed.spanStyles.map { parsed.text.substring(it.start, it.end) })
    }

    @Test
    fun unclosedOrEscapedMarksStayAsTyped() {
        assertEquals("**not closed", parse("**not closed").text)
        assertEquals("*literal* and [x]", parse("""\*literal\* and \[x\]""").text)
        assertEquals("[label] (no link)", parse("[label] (no link)").text)
        assertTrue(parse("[label] (no link)").getLinkAnnotations(0, 17).isEmpty())
    }
}
