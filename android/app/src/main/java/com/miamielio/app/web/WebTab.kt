package com.miamielio.app.web

import android.view.View
import android.view.ViewGroup
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.miamielio.app.R
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.Theme

/** A tab that shows part of the Miami Elio site. */
@Composable
fun WebTab(controller: WebTabController, modifier: Modifier = Modifier) {
    val state by controller.state.collectAsStateWithLifecycle()
    val failure = state.failure

    // The tab came on screen: the first load, or a look at what changed meanwhile.
    LaunchedEffect(controller) { controller.activate() }

    // "Back" leafs through the pages of this tab before it leaves the tab.
    BackHandler(enabled = state.canGoBack && failure == null) { controller.goBack() }

    Box(
        modifier
            .fillMaxSize()
            .background(Theme.paper)
            .statusBarsPadding(),
    ) {
        AndroidView(
            factory = {
                controller.container.also { view -> (view.parent as? ViewGroup)?.removeView(view) }
            },
            modifier = Modifier
                .fillMaxSize()
                .alpha(if (failure == null) 1f else 0f),
            update = { view ->
                // The page under a failure screen is not there for a screen reader either.
                view.importantForAccessibility = if (failure == null) {
                    View.IMPORTANT_FOR_ACCESSIBILITY_AUTO
                } else {
                    View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
                }
            },
        )

        if (state.isLoading && failure == null) {
            val loading = stringResource(R.string.state_loading)
            LinearProgressIndicator(
                progress = { state.progress.coerceIn(0.05f, 1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.dp)
                    .semantics { contentDescription = loading },
                color = Theme.accent,
                trackColor = Color.Transparent,
                gapSize = 0.dp,
                drawStopIndicator = {},
            )
        }

        if (failure != null) {
            LoadFailureView(failure = failure, onRetry = controller::retry)
        }
    }
}

@Composable
internal fun LoadFailureView(failure: LoadFailure, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Theme.paper)
            .padding(32.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            painter = painterResource(if (failure.isOffline) R.drawable.ic_offline else R.drawable.ic_warning),
            contentDescription = null,
            modifier = Modifier.size(44.dp),
            tint = Theme.soft,
        )
        Text(
            text = stringResource(if (failure.isOffline) R.string.offline_title else R.string.error_generic),
            modifier = Modifier.semantics { heading() },
            color = Theme.ink,
            style = AppFont.title,
            textAlign = TextAlign.Center,
        )
        if (failure.isOffline) {
            Text(
                text = stringResource(R.string.offline_message),
                color = Theme.soft,
                style = AppFont.body,
                textAlign = TextAlign.Center,
            )
        }
        Button(
            onClick = onRetry,
            modifier = Modifier
                .padding(top = 6.dp)
                .testTag("web.retry"),
            shape = CircleShape,
            colors = ButtonDefaults.buttonColors(containerColor = Theme.accent, contentColor = Theme.onAccent),
            contentPadding = PaddingValues(horizontal = 28.dp, vertical = 12.dp),
        ) {
            Text(text = stringResource(R.string.action_retry), style = AppFont.button)
        }
    }
}
