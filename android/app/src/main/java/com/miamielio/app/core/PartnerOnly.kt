package com.miamielio.app.core

/**
 * Yachts are booked through YATR and stays through Stay22, inside the site's
 * own pages for them (/yachts, /vacation-rentals). Miami Elio has no yachts or
 * villas of its own: a page of one ("/yachts/azure-72") is a retired sample
 * listing, and the app shows it nowhere. The sections' own pages stay.
 */
object PartnerOnly {
    private val retired = Regex("""^(?:https?://[^/]+)?/(?:yachts|vacation-rentals)/[^/?#]+""", RegexOption.IGNORE_CASE)

    /** True for the page of a single yacht or villa: a listing that is not real. */
    fun isRetiredListing(href: String): Boolean = retired.containsMatchIn(href.trim())
}
