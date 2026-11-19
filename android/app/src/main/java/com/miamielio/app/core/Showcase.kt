package com.miamielio.app.core

import kotlinx.serialization.json.JsonObject
import kotlin.math.floor

/** What a showcase card offers, as the site's `assembleShowcase` labels it. */
enum class ShowcaseCategory(val wire: String) {
    Car("car"), Yacht("yacht"), Stay("stay"), Jet("jet"), Event("event");

    companion object {
        fun of(wire: String?): ShowcaseCategory? = entries.firstOrNull { it.wire == wire }
    }
}

/** One card of the site's home-page showcase, as `/api/showcase` sends it. */
data class ShowcaseItem(
    val category: ShowcaseCategory,
    /** Site-relative ("/rentals/lamborghini-urus-se") or a full address. */
    val href: String,
    val title: String,
    /** A full https address of the picture. */
    val image: String,
    val price: String? = null,
    val company: String? = null,
    val length: String? = null,
    val location: String? = null,
    val bedrooms: Int? = null,
    /** The listing's own kind ("SUVs"); not [category]. */
    val kind: String? = null,
    val kicker: String? = null,
    val lineId: String? = null,
) {
    companion object {
        /** An item the card can show, or null: the same rules the site applies before it sends one. */
        internal fun decode(json: JsonObject): ShowcaseItem? {
            val category = ShowcaseCategory.of(json.text("cat")) ?: return null
            // Yachts and stays are only booked through partners: no card of ours for them.
            if (category == ShowcaseCategory.Yacht || category == ShowcaseCategory.Stay) return null
            val href = json.text("href")?.takeUnless(PartnerOnly::isRetiredListing) ?: return null
            val title = json.text("title") ?: return null
            val image = json.text("image")?.takeIf { it.startsWith("https://") } ?: return null
            return ShowcaseItem(
                category = category,
                href = href,
                title = title,
                image = image,
                price = json.text("price"),
                company = json.text("company"),
                length = json.text("length"),
                location = json.text("location"),
                bedrooms = json.int("bedrooms")?.takeIf { it > 0 },
                kind = json.text("category"),
                kicker = json.text("kicker"),
                lineId = json.text("lineId"),
            )
        }

        private val money = Regex("""\$\s?\d""")
        private val onRequest = Regex("request|enquir|inquir", RegexOption.IGNORE_CASE)

        /** `showcasePrice` of the site: a price worth showing ("$2,000"), or null for "On request" and the like. */
        fun price(value: String?): String? {
            val text = value?.trim().orEmpty()
            if (text.isEmpty() || !money.containsMatchIn(text) || onRequest.containsMatchIn(text)) return null
            return text
        }
    }
}

/** Where a card hangs over the hero: its top start or top end corner (the site's `tl` / `tr`). */
enum class ShowcaseCorner(val site: String) {
    TopStart("tl"), TopEnd("tr");

    /** The site's `cornerSide`: the start side is its "L". */
    val startSide: Boolean get() = this == TopStart
}

/** How a card comes in. The site's "slide" becomes one of the two slides, by side. */
enum class ShowcaseEnter { Swing, Rise, Focus, SlideFromStart, SlideFromEnd }

/** How a card goes. The site's "outSide" becomes one of the two, by side. */
enum class ShowcaseExit { Up, Down, Fade, ToStart, ToEnd }

/** What the next step needs to remember of the ones before it. */
data class ShowcaseState(
    val lastCategory: ShowcaseCategory? = null,
    val lastCorner: ShowcaseCorner? = null,
    /** The site's own name of the last entrance ("slide" for either slide). */
    val lastEnter: String? = null,
    /** The cards already shown in this round, by href. */
    val used: Set<String> = emptySet(),
)

data class ShowcaseStep(
    val item: ShowcaseItem,
    val corner: ShowcaseCorner,
    val enter: ShowcaseEnter,
    val exit: ShowcaseExit,
    /** The card's tilt in degrees: negative on the start side, as the site does. */
    val rotation: Float,
    val state: ShowcaseState,
)

/**
 * `nextShowcaseStep` of the site's `lib/heroShowcase.js`, for a phone
 * (`mobile = true`): a card of another kind than the last, not shown yet in
 * this round, in the other top corner, with another entrance. [random] stands
 * for `Math.random` and is drawn in the site's order (kind, card, corner,
 * entrance, exit, tilt), so a fixed sequence gives the site's own answer.
 */
fun nextShowcaseStep(pool: List<ShowcaseItem>, state: ShowcaseState, random: () -> Double): ShowcaseStep? {
    if (pool.isEmpty()) return null
    var used = state.used
    if (pool.all { it.href in used }) used = emptySet()
    val available = pool.filter { it.href !in used }
    val source = available.ifEmpty { pool }

    val kinds = source.map { it.category }.distinct()
    val categories = kinds.filter { it != state.lastCategory }.ifEmpty { kinds }
    val category = categories.pick(random)
    val item = source.filter { it.category == category }.pick(random)
    used = used + item.href

    val all = ShowcaseCorner.entries
    val corners = all.filter { corner ->
        val last = state.lastCorner ?: return@filter true
        corner != last && corner.startSide != last.startSide
    }
    val corner = corners.ifEmpty { all }.pick(random)

    val enterName = ENTERS.filter { it != state.lastEnter }.pick(random)
    val exitName = EXITS.pick(random)
    val start = corner.startSide
    val rotation = ((random() * 7 + 2) * if (start) -1 else 1).toFloat()

    val enter = when (enterName) {
        "swing" -> ShowcaseEnter.Swing
        "rise" -> ShowcaseEnter.Rise
        "focus" -> ShowcaseEnter.Focus
        else -> if (start) ShowcaseEnter.SlideFromStart else ShowcaseEnter.SlideFromEnd
    }
    val exit = when (exitName) {
        "outUp" -> ShowcaseExit.Up
        "outDown" -> ShowcaseExit.Down
        "outFade" -> ShowcaseExit.Fade
        else -> if (start) ShowcaseExit.ToStart else ShowcaseExit.ToEnd
    }
    return ShowcaseStep(
        item = item,
        corner = corner,
        enter = enter,
        exit = exit,
        rotation = rotation,
        state = ShowcaseState(lastCategory = category, lastCorner = corner, lastEnter = enterName, used = used),
    )
}

/** The step shown when animations are off: the first card, still, in the top end corner. */
fun stillShowcaseStep(pool: List<ShowcaseItem>): ShowcaseStep? = pool.firstOrNull()?.let {
    ShowcaseStep(it, ShowcaseCorner.TopEnd, ShowcaseEnter.Focus, ShowcaseExit.Fade, 4f, ShowcaseState(used = setOf(it.href)))
}

private val ENTERS = listOf("swing", "rise", "focus", "slide")
private val EXITS = listOf("outUp", "outDown", "outFade", "outSide")

/** `list[Math.floor(Math.random() * list.length)]`. */
private fun <T> List<T>.pick(random: () -> Double): T =
    this[floor(random() * size).toInt().coerceIn(0, size - 1)]
