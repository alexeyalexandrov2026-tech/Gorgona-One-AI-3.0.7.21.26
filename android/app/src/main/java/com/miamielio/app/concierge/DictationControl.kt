package com.miamielio.app.concierge

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.miamielio.app.R
import com.miamielio.app.ui.AppFont
import com.miamielio.app.ui.ConciergeMark
import com.miamielio.app.ui.OrbActivity
import com.miamielio.app.ui.Theme
import kotlinx.coroutines.delay

internal class DictationControl(
    val cancel: () -> Unit,
    val button: @Composable (enabled: Boolean) -> Unit,
    val feedback: @Composable () -> Unit,
)

@Composable
internal fun rememberDictation(
    draft: String,
    language: () -> String,
    onDraft: (String) -> Unit,
    sending: Boolean,
): DictationControl {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val focus = LocalFocusManager.current
    val dictation = remember(context) { Dictation(context) }
    val latestDraft by rememberUpdatedState(draft)
    val latestLanguage by rememberUpdatedState(language)
    val updateDraft by rememberUpdatedState(onDraft)
    val latestSending by rememberUpdatedState(sending)
    var denied by remember { mutableStateOf(false) }
    var showingPermission by remember { mutableStateOf(false) }

    fun start() {
        if (!lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED) || latestSending) return
        denied = false
        focus.clearFocus()
        val prefix = latestDraft
        var lastDraft = prefix
        dictation.start(latestLanguage()) { text ->
            val current = latestDraft
            // Preserve edits typed while recognition was in progress.
            if (current == prefix || current == lastDraft) {
                lastDraft = Dictation.appendToDraft(prefix, text)
                updateDraft(lastDraft)
            }
        }
    }
    val request = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { allowed ->
        denied = !allowed
        if (allowed) start()
    }
    LifecycleEventEffect(Lifecycle.Event.ON_PAUSE) { dictation.cancel() }
    DisposableEffect(dictation) { onDispose { dictation.cancel() } }
    val active = dictation.state == DictationState.Listening || dictation.state == DictationState.Finishing
    LaunchedEffect(active) {
        if (active) {
            delay(60_000)
            dictation.cancel()
        }
    }
    LaunchedEffect(sending) { if (sending) dictation.cancel() }

    if (showingPermission) {
        AlertDialog(
            onDismissRequest = { showingPermission = false },
            title = { Text(stringResource(R.string.voice_speak)) },
            text = { Text(stringResource(R.string.voice_permission_explanation)) },
            confirmButton = {
                TextButton(onClick = {
                    showingPermission = false
                    request.launch(Manifest.permission.RECORD_AUDIO)
                }) { Text(stringResource(R.string.voice_speak)) }
            },
            dismissButton = {
                TextButton(onClick = { showingPermission = false }) {
                    Text(stringResource(R.string.action_cancel))
                }
            },
        )
    }
    return DictationControl(
        cancel = dictation::cancel,
        button = { enabled ->
            val label = stringResource(if (active) R.string.voice_stop else R.string.voice_speak)
            IconButton(
                onClick = {
                    if (active) {
                        if (dictation.state == DictationState.Listening) dictation.stop() else dictation.cancel()
                    } else if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        start()
                    } else {
                        showingPermission = true
                    }
                },
                modifier = Modifier.size(48.dp).testTag("concierge.voice").semantics { contentDescription = label },
                enabled = enabled,
            ) {
                if (active) {
                    ConciergeMark(diameter = 24.dp, activity = OrbActivity.Listening, level = dictation.level)
                } else {
                    Icon(painterResource(R.drawable.ic_mic), contentDescription = null, tint = Theme.soft)
                }
            }
        },
        feedback = {
            val message = when {
                denied -> R.string.voice_denied
                dictation.state == DictationState.Unavailable -> R.string.voice_unavailable
                dictation.state == DictationState.Listening -> R.string.voice_listening
                else -> null
            }
            if (message != null) {
                Row(
                    Modifier.padding(horizontal = 16.dp).semantics { liveRegion = LiveRegionMode.Polite },
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(stringResource(message), Modifier.weight(1f), color = Theme.soft, style = AppFont.detail)
                    if (denied) {
                        TextButton(onClick = {
                            context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null)))
                        }) { Text(stringResource(R.string.action_settings)) }
                    }
                }
            }
        },
    )
}
