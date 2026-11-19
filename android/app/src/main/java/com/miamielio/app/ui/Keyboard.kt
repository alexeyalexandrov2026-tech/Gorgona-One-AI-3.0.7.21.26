package com.miamielio.app.ui

import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.InputMode
import androidx.compose.ui.input.InputModeManager
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.dp

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

/**
 * A place for the focus to rest, so that it does not rest on a text field.
 *
 * Compose hands the focus to the first thing that can take it, by itself,
 * when the window gets its focus. With a finger on the screen the first
 * thing that can take it is the first text field, and the keyboard comes up
 * for a guest who has done nothing. Put first in the screen, this takes the
 * focus instead: it is 1 dp, draws nothing and is invisible to a screen
 * reader. A tap still moves the focus to the field tapped, as before.
 *
 * It is only there while [inputMode] is touch. With a keyboard the first
 * control must be the one that takes the focus (and shows it), so the focus
 * passes over this.
 */
@Composable
fun FocusRest(inputMode: InputModeManager, modifier: Modifier = Modifier) {
    Box(
        modifier
            .size(1.dp)
            // What a modifier clears is what comes after it: this goes before the focus.
            .clearAndSetSemantics { }
            .focusProperties { canFocus = inputMode.inputMode == InputMode.Touch }
            .focusable(),
    )
}
