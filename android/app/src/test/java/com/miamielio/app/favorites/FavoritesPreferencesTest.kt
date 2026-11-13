package com.miamielio.app.favorites

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.miamielio.app.core.FavoriteRef
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.UUID

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class FavoritesPreferencesTest {
    @Test
    fun pendingEditsAndSavedKeysSurviveReopeningPreferences() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val name = "favorites-test-" + UUID.randomUUID()
        val preferences = context.getSharedPreferences(name, Context.MODE_PRIVATE)
        val yacht = requireNotNull(FavoriteRef.of("yacht", "a", "A \"yacht\"", "Miami", "/photo.jpg"))
        val car = requireNotNull(FavoriteRef.of("car", "b", "Car"))
        val saved = FavoritesSnapshot(
            keys = setOf(car.key),
            pending = listOf(FavoriteChange(yacht, true), FavoriteChange(car, true), FavoriteChange(yacht, false)),
        )
        FavoritesPreferences(preferences).save(saved)

        // Finish asynchronous writes as Android does at a lifecycle boundary.
        assertTrue(preferences.edit().putBoolean("test-barrier", true).commit())
        val reopened = FavoritesPreferences(context.getSharedPreferences(name, Context.MODE_PRIVATE))
        assertEquals(saved, reopened.load())
    }

    @Test
    fun invalidStoredEditsDoNotClearValidFavorites() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val preferences = context.getSharedPreferences("favorites-corrupt-" + UUID.randomUUID(), Context.MODE_PRIVATE)
        val stored = """
            {"keys":["stay:villa-azure","bad:key",17],"pending":[
              {"kind":"yacht","slug":"a","title":"Yacht","on":"true"},
              {"kind":"car","slug":"b","title":"Car","on":false},
              {"kind":"stay","slug":"bad path","title":"Stay","on":true}
            ]}
        """.trimIndent()
        preferences.edit().putString("snapshot_v1", stored).apply()
        val read = FavoritesPreferences(preferences).load()

        assertEquals(setOf("stay:villa-azure"), read.keys)
        assertEquals("car:b", read.pending.single().favorite.key)
        assertFalse(read.pending.single().on)
    }
}
