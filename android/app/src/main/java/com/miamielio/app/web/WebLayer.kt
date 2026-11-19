package com.miamielio.app.web

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.miamielio.app.R
import com.miamielio.app.ui.Hairline
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.Wordmark

/**
 * A page of the site shown over the current tab: a listing, a section, a
 * partner's booking form. "Back" leafs through the pages opened here, then
 * puts the layer away and leaves the guest on the tab they came from.
 */
@Composable
fun WebLayer(controller: WebTabController, onClose: () -> Unit, modifier: Modifier = Modifier) {
    val state by controller.state.collectAsStateWithLifecycle()
    val leftToRight = LocalLayoutDirection.current == LayoutDirection.Ltr

    // Declared before WebTab's own handler, so WebTab's (history) answers first.
    BackHandler(onBack = onClose)

    Column(
        modifier
            .fillMaxSize()
            .background(Theme.paper)
            .testTag("web.layer"),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .height(52.dp)
                .padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = { if (state.canGoBack) controller.goBack() else onClose() },
                modifier = Modifier.testTag("web.back"),
            ) {
                Icon(
                    painter = painterResource(R.drawable.ic_arrow_forward),
                    contentDescription = stringResource(R.string.web_back),
                    // The forward arrow, turned to point back in either reading direction.
                    modifier = Modifier
                        .size(20.dp)
                        .graphicsLayer { scaleX = if (leftToRight) -1f else 1f },
                    tint = Theme.ink,
                )
            }
            Spacer(Modifier.width(4.dp))
            Wordmark(size = 20f)
        }
        Hairline()
        // WebTab pads for the status bar itself; the header above already did.
        WebTab(controller, Modifier.fillMaxSize(), padStatusBar = false)
    }
}
