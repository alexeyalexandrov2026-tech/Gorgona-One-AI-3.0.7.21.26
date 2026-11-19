package com.miamielio.app.season

import com.miamielio.app.core.SeasonEvent
import com.miamielio.app.ui.oceanBackground
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.miamielio.app.ui.MenuButton
import com.miamielio.app.ui.Wordmark

/**
 * The Events screen: the weeks of the Miami season, a reminder for each, and a
 * way to plan one with the concierge ([onPlan] gets the ready-made request).
 * It is no tab of the bar: Today's next-event row and the menu open it, and
 * "back" returns to Today.
 */
@Composable
internal fun EventsScreen(
    reminders: SeasonReminders,
    onPlan: (String) -> Unit,
    onMenu: () -> Unit,
    modifier: Modifier = Modifier,
    photo: (SeasonEvent) -> String? = { null },
) {
    Column(
        modifier
            .fillMaxSize()
            .oceanBackground()
            .testTag("content.Events"),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .heightIn(min = 56.dp)
                // 4 dp in puts the menu icon (24 dp in a 48 dp button) on the list's 16 dp edge.
                .padding(start = 4.dp, end = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            MenuButton(onMenu)
            Spacer(Modifier.width(4.dp))
            Wordmark(size = 22f)
        }
        Column(
            Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
        ) {
            SeasonList(reminders, onPrepare = onPlan, photo = photo)
        }
    }
}
