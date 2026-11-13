package com.miamielio.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DeepLinkTest {
    @Test
    fun readsTheNativeTabs() {
        assertEquals(DeepLink.Concierge, DeepLink.parse("miamielio://concierge"))
        assertEquals(DeepLink.Search, DeepLink.parse("miamielio://search"))
        assertEquals(DeepLink.Account, DeepLink.parse("miamielio://account"))
        // Schemes and hosts are not case-sensitive.
        assertEquals(DeepLink.Search, DeepLink.parse("MiamiElio://Search"))
    }

    @Test
    fun readsAPageOfTheSite() {
        assertEquals(DeepLink.Open("/yachts"), DeepLink.parse("miamielio://open?path=/yachts"))
        assertEquals(DeepLink.Open("/yachts/azimut-55"), DeepLink.parse("miamielio://open?path=%2Fyachts%2Fazimut-55"))
        assertEquals(DeepLink.Open("/rentals"), DeepLink.parse("miamielio://open?utm=x&path=/rentals#top"))
        // No path is the home page.
        assertEquals(DeepLink.Open("/"), DeepLink.parse("miamielio://open"))
        assertEquals(DeepLink.Open("/"), DeepLink.parse("miamielio://open?path=%zz"))
    }

    @Test
    fun neverPointsTheAppAtAnotherSite() {
        assertNull(DeepLink.parse("miamielio://open?path=//evil.example.com"))
        assertNull(DeepLink.parse("miamielio://open?path=https://evil.example.com"))
        assertNull(DeepLink.parse("miamielio://open?path=%2F%2Fevil.example.com"))
        assertNull(DeepLink.parse("miamielio://open?path=/%5Cevil.example.com"))
        assertNull(DeepLink.parse("miamielio://open?path=yachts"))
    }

    @Test
    fun ignoresEverythingThatIsNotItsOwnScheme() {
        assertNull(DeepLink.parse("https://gorgona-one.com/yachts"))
        assertNull(DeepLink.parse("intent://concierge#Intent;scheme=miamielio;end"))
        assertNull(DeepLink.parse("not a link"))
        assertNull(DeepLink.parse(""))
    }
}
