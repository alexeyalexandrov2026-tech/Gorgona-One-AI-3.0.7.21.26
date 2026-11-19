package com.miamielio.app.season

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.miamielio.app.ui.Theme

/**
 * The Events tab: the weeks of the Miami season, a reminder for each, and a
 * way to plan one with the concierge ([onPlan] gets the ready-made request).
 */
@Composable
internal fun EventsScreen(reminders: SeasonReminders, onPlan: (String) -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxSize()
            .background(Theme.paper)
            .verticalScroll(rememberScrollState())
            .statusBarsPadding()
            .padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 24.dp)
            .testTag("content.Events"),
    ) {
        SeasonList(reminders, onPrepare = onPlan)
    }
}
