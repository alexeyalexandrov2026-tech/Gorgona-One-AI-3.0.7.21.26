package com.miamielio.app.ui

import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onRoot
import com.miamielio.app.BrandScreen
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/**
 * Draws the brand screen for real (Robolectric's native graphics) and looks
 * at the pixels. The picture is kept in `build/outputs/snapshots` so a
 * person can look at it too.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w360dp-h740dp-xhdpi")
class BrandSnapshotTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    fun theBrandScreenIsDarkPaperWithAGoldOrbAndTheWordmark() {
        compose.setContent { MiamiElioTheme { BrandScreen() } }
        compose.mainClock.advanceTimeBy(2_000)

        val picture = compose.onRoot().captureToImage().asAndroidBitmap()
        save(picture, "brand.png")

        // The corners are the site's dark paper.
        val paper = Color.rgb(0x0A, 0x12, 0x18)
        assertEquals(paper, picture.getPixel(4, 4))
        assertEquals(paper, picture.getPixel(picture.width - 5, picture.height - 5))

        var gold = 0
        var accent = 0
        var ink = 0
        for (y in 0 until picture.height step 2) {
            for (x in 0 until picture.width step 2) {
                val pixel = picture.getPixel(x, y)
                val (red, green, blue) = Triple(Color.red(pixel), Color.green(pixel), Color.blue(pixel))
                if (red > 170 && green in 120..235 && blue < 190 && red - blue > 45) gold++
                if (red > 230 && green in 80..140 && blue in 120..175) accent++
                if (red > 220 && green > 225 && blue > 225) ink++
            }
        }
        // The orb is 96dp across: thousands of sampled gold pixels.
        assertTrue("gold pixels: $gold", gold > 2_000)
        // "MIAMI" in the accent colour and "Elio" in ink.
        assertTrue("accent pixels: $accent", accent > 20)
        assertTrue("ink pixels: $ink", ink > 50)
    }

    private fun save(picture: Bitmap, name: String) {
        val folder = File("build/outputs/snapshots").apply { mkdirs() }
        File(folder, name).outputStream().use { picture.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
