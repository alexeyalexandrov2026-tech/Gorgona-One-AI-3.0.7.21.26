package com.miamielio.app.ui

import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onRoot
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
    fun theSplashIsTheSeaWithTheGoldMonogramAndTheName() {
        compose.setContent { MiamiElioTheme { SplashView() } }
        compose.mainClock.advanceTimeBy(2_000)

        val picture = compose.onRoot().captureToImage().asAndroidBitmap()
        save(picture, "brand.png")

        // The top corner is the deep teal sea of the brand art, not the paper of the pages.
        val corner = picture.getPixel(4, 4)
        assertTrue("corner: ${Integer.toHexString(corner)}", Color.green(corner) > Color.red(corner) && Color.blue(corner) > Color.red(corner))
        assertTrue("corner is dark: ${Integer.toHexString(corner)}", Color.green(corner) < 90)

        var gold = 0
        var ivory = 0
        for (y in 0 until picture.height step 2) {
            for (x in 0 until picture.width step 2) {
                val pixel = picture.getPixel(x, y)
                val (red, green, blue) = Triple(Color.red(pixel), Color.green(pixel), Color.blue(pixel))
                if (red > 150 && green in 100..220 && blue < 150 && red - blue > 50) gold++
                if (red > 225 && green > 220 && blue in 195..240 && red >= blue) ivory++
            }
        }
        // The monogram's ring and letters, 168 dp across.
        assertTrue("gold pixels: $gold", gold > 1_000)
        // "MIAMI ELIO" in ivory beneath it.
        assertTrue("ivory pixels: $ivory", ivory > 50)
    }

    private fun save(picture: Bitmap, name: String) {
        val folder = File("build/outputs/snapshots").apply { mkdirs() }
        File(folder, name).outputStream().use { picture.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
