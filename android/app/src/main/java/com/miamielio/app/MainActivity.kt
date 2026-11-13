package com.miamielio.app

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.miamielio.app.ui.ConciergeMark
import com.miamielio.app.ui.MiamiElioTheme
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.Wordmark
import com.miamielio.app.ui.arrives

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // One appearance, dark: light icons in both system bars, always.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        setContent { MiamiElioTheme { BrandScreen() } }
    }
}

/**
 * The orb and the wordmark on the site's dark paper. Stands in for the tabs
 * until they are built; the splash keeps this composition.
 */
@Composable
fun BrandScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Theme.paper)
            .safeDrawingPadding(),
        verticalArrangement = Arrangement.spacedBy(28.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        ConciergeMark(diameter = 96.dp, modifier = Modifier.arrives(0), breathes = true)
        Wordmark(modifier = Modifier.arrives(1), size = 34f)
    }
}
