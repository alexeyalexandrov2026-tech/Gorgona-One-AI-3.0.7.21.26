package com.miamielio.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.platform.LocalFocusManager

/**
 * For `Modifier.nestedScroll`: dragging a list puts the keyboard away, which
 * is also what uncovers the tab bar. Scrolling the app does by itself (to a
 * new reply, say) leaves the keyboard where it is.
 */
@Composable
fun rememberKeyboardDismissal(): NestedScrollConnection {
    val focus = LocalFocusManager.current
    return remember(focus) {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (source == NestedScrollSource.UserInput && available.y != 0f) focus.clearFocus()
                return Offset.Zero
            }
        }
    }
}
