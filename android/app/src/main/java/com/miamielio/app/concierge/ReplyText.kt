package com.miamielio.app.concierge

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle

/**
 * Replies sometimes carry light Markdown: bold, italics, code and links.
 * They are shown as formatting rather than asterisks, as in the iPhone app;
 * anything that does not close stays as it was typed. A link goes through
 * [annotated]'s `onLink`, so it follows the same rules as every other link.
 */
object ReplyText {
    private val bold = SpanStyle(fontWeight = FontWeight.SemiBold)
    private val italic = SpanStyle(fontStyle = FontStyle.Italic)
    private val code = SpanStyle(fontFamily = FontFamily.Monospace)

    // 1 escaped character; 2-3 [label](href); 4 **bold**; 5 __bold__;
    // 6 *italic*; 7 _italic_ (not inside a word, so snake_case survives);
    // 8 `code`.
    private val token = Regex(
        """\\([\\`*_\[\]()])""" +
            """|\[([^\]\n]+)]\(([^()\s]+)\)""" +
            """|\*\*(?=\S)(.+?)(?<=\S)\*\*""" +
            """|__(?=\S)(.+?)(?<=\S)__""" +
            """|\*(?=\S)([^*\n]+?)(?<=\S)\*""" +
            """|(?<![\p{L}\p{N}_])_(?=\S)([^_\n]+?)(?<=\S)_(?![\p{L}\p{N}_])""" +
            """|`([^`\n]+)`""",
    )

    fun annotated(text: String, link: SpanStyle, onLink: (String) -> Unit): AnnotatedString =
        buildAnnotatedString { appendInline(text, link, onLink) }

    private fun AnnotatedString.Builder.appendInline(text: String, link: SpanStyle, onLink: (String) -> Unit) {
        var at = 0
        for (match in token.findAll(text)) {
            append(text, at, match.range.first)
            val groups = match.groups
            when {
                groups[1] != null -> append(groups[1]!!.value)
                groups[2] != null -> {
                    val href = groups[3]!!.value
                    val annotation = LinkAnnotation.Clickable(
                        tag = href,
                        styles = TextLinkStyles(style = link),
                        linkInteractionListener = { onLink(href) },
                    )
                    withLink(annotation) { appendInline(groups[2]!!.value, link, onLink) }
                }
                groups[4] != null || groups[5] != null ->
                    withStyle(bold) { appendInline((groups[4] ?: groups[5])!!.value, link, onLink) }
                groups[6] != null || groups[7] != null ->
                    withStyle(italic) { appendInline((groups[6] ?: groups[7])!!.value, link, onLink) }
                groups[8] != null -> withStyle(code) { append(groups[8]!!.value) }
            }
            at = match.range.last + 1
        }
        append(text, at, text.length)
    }
}
