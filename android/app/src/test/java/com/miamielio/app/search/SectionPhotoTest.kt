package com.miamielio.app.search

import com.miamielio.app.R
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** A result without a photo of its own borrows its section's. */
class SectionPhotoTest {
    @Test
    fun aResultBorrowsItsSectionsPhoto() {
        assertEquals(R.drawable.world_yachts, sectionPhoto("/yachts"))
        assertEquals(R.drawable.world_yachts, sectionPhoto("https://gorgona-one.com/yachts?ref=yatr"))
        assertEquals(R.drawable.world_cars, sectionPhoto("/rentals/ferrari-roma"))
        assertEquals(R.drawable.world_villas, sectionPhoto(" /vacation-rentals "))
        assertEquals(R.drawable.world_dining, sectionPhoto("/restaurants-nightlife/komodo-miami"))
    }

    @Test
    fun aPathOutsideTheSectionsHasNone() {
        assertNull(sectionPhoto("/profile"))
        assertNull(sectionPhoto("/yachtsman"))
        assertNull(sectionPhoto("https://partner.example.com"))
    }
}
