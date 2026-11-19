package com.miamielio.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusManager
import androidx.compose.ui.input.InputMode
import androidx.compose.ui.input.InputModeManager
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotFocused
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import android.view.View
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Compose hands the focus to the first thing that can take it, on its own,
 * when the window gets its focus. With a finger on the screen that would be a
 * text field and the keyboard would come up unasked; [FocusRest], put first,
 * takes that focus instead. Robolectric has no finger, so the input mode is a
 * stand-in that these tests set.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
class FocusTest {
    @get:Rule
    val compose = createComposeRule()

    private class Mode(override var inputMode: InputMode) : InputModeManager {
        override fun requestInputMode(inputMode: InputMode): Boolean {
            this.inputMode = inputMode
            return true
        }
    }

    private var focus: FocusManager? = null
    private var view: View? = null

    private fun show(mode: InputModeManager) {
        compose.setContent {
            focus = LocalFocusManager.current
            view = LocalView.current
            Box {
                FocusRest(mode)
                Column {
                    BasicTextField(value = "", onValueChange = {}, modifier = Modifier.testTag("first"))
                    BasicTextField(value = "", onValueChange = {}, modifier = Modifier.testTag("second"))
                }
            }
        }
    }

    /** Android asks the view for its focus, as it does when the window opens: Compose then picks what to focus. */
    private fun theWindowAsksForFocus() {
        compose.runOnUiThread {
            view!!.clearFocus()
            view!!.requestFocus()
        }
        compose.waitForIdle()
    }

    private fun noFieldIsFocused() {
        compose.onNodeWithTag("first").assertIsNotFocused()
        compose.onNodeWithTag("second").assertIsNotFocused()
    }

    @Test
    fun withAFingerNoFieldIsHandedTheFocusAndATapStillTakesIt() {
        show(Mode(InputMode.Touch))
        theWindowAsksForFocus()
        noFieldIsFocused()

        compose.onNodeWithTag("second").performClick()
        compose.onNodeWithTag("second").assertIsFocused()
        // Once inside, moving between the fields is the content's own business.
        compose.runOnUiThread { focus!!.moveFocus(FocusDirection.Previous) }
        compose.onNodeWithTag("first").assertIsFocused()
    }

    @Test
    fun withAKeyboardTheFirstFieldIsFound() {
        show(Mode(InputMode.Keyboard))
        theWindowAsksForFocus()
        compose.onNodeWithTag("first").assertIsFocused()
    }

    @Test
    fun theModeIsReadWhenTheFocusMoves() {
        val mode = Mode(InputMode.Touch)
        show(mode)
        theWindowAsksForFocus()
        noFieldIsFocused()

        // The guest reaches for a keyboard: the same move now finds the way in.
        mode.inputMode = InputMode.Keyboard
        theWindowAsksForFocus()
        compose.onNodeWithTag("first").assertIsFocused()
    }
}
