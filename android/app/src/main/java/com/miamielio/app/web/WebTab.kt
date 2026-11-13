package com.miamielio.app.web

import android.view.ViewGroup
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.miamielio.app.R
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.AppIcon
import com.miamielio.app.ui.Theme
import com.miamielio.app.ui.pressable

/** A tab that shows part of the Miami Elio site. */
@Composable
fun WebTab(page: WebPage, tag: String, modifier: Modifier = Modifier, onShown: () -> Unit = {}) {
    val state by page.state.collectAsState()
    val failure = state.failure

    LaunchedEffect(page) {
        page.activate()
        onShown()
    }

    Box(
        modifier
            .fillMaxSize()
            .background(Theme.paper)
            .statusBarsPadding()
            .testTag(tag),
    ) {
        val view = page.hostView()
        if (view != null) {
            AndroidView(
                factory = {
                    // The same web view for the whole life of the screen: it
                    // only changes which tab it is attached under.
                    (view.parent as? ViewGroup)?.removeView(view)
                    view
                },
                modifier = Modifier
                    .fillMaxSize()
                    .alpha(if (failure == null) 1f else 0f),
            )
        }

        if (state.isLoading && failure == null) {
            val loading = stringResource(R.string.state_loading)
            LinearProgressIndicator(
                progress = { state.progress.coerceIn(0.05f, 1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.dp)
                    .clearAndSetSemantics { contentDescription = loading },
                color = Theme.accent,
                trackColor = Color.Transparent,
                drawStopIndicator = {},
            )
        }

        if (failure != null) {
            LoadFailureView(failure) { page.retry() }
        }
    }
}

@Composable
private fun LoadFailureView(failure: LoadFailure, retry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Theme.paper)
            .padding(32.dp)
            .testTag(if (failure.isOffline) "web.offline" else "web.error"),
        verticalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        AppIcon(if (failure.isOffline) R.drawable.ic_offline else R.drawable.ic_warning, size = 40.dp)
        Text(
            stringResource(if (failure.isOffline) R.string.offline_title else R.string.error_generic),
            modifier = Modifier.semantics { heading() },
            color = Theme.ink,
            style = AppFont.title,
            textAlign = TextAlign.Center,
        )
        if (failure.isOffline) {
            Text(
                stringResource(R.string.offline_message),
                color = Theme.soft,
                style = AppFont.body,
                textAlign = TextAlign.Center,
            )
        }
        Text(
            stringResource(R.string.action_retry),
            modifier = Modifier
                .padding(top = 6.dp)
                .testTag("web.retry")
                .background(Theme.accent, RoundedCornerShape(50))
                .pressable(onClick = retry)
                .padding(horizontal = 28.dp, vertical = 14.dp),
            color = Theme.onAccent,
            style = AppFont.button,
        )
    }
}
