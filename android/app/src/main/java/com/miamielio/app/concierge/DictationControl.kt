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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
import kotlinx.coroutines.launch

internal class DictationControl(
    val isListening: Boolean,
    val level: Double,
    val cancel: () -> Unit,
    val startListening: () -> Unit,
    val requestPermissionAndStart: () -> Unit,
    val button: @Composable (enabled: Boolean) -> Unit,
    val feedback: @Composable () -> Unit,
)

@Composable
internal fun rememberDictation(
    draft: String,
    language: () -> String,
    onDraft: (String) -> Unit,
    sending: Boolean,
    liveVoice: Boolean = false,
    onBeforeStart: () -> Unit = {},
    onLiveFinal: (String) -> Unit = {},
    onLiveSilentStop: () -> Unit = {},
    onPermissionDenied: () -> Unit = {},
): DictationControl {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val focus = LocalFocusManager.current
    val scope = rememberCoroutineScope()
    val dictation = remember(context) { Dictation(context) }
    val latestDraft by rememberUpdatedState(draft)
    val latestLanguage by rememberUpdatedState(language)
    val updateDraft by rememberUpdatedState(onDraft)
    val latestSending by rememberUpdatedState(sending)
    val latestLiveVoice by rememberUpdatedState(liveVoice)
    val latestBeforeStart by rememberUpdatedState(onBeforeStart)
    val latestLiveFinal by rememberUpdatedState(onLiveFinal)
    val latestLiveSilentStop by rememberUpdatedState(onLiveSilentStop)
    val latestPermissionDenied by rememberUpdatedState(onPermissionDenied)
    var denied by remember { mutableStateOf(false) }
    var showingPermission by remember { mutableStateOf(false) }
    var silentTurns by remember { mutableIntStateOf(0) }

    fun start() {
        if (!lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED) || latestSending) return
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) return
        denied = false
        focus.clearFocus()
        latestBeforeStart()
        val prefix = if (latestLiveVoice) "" else latestDraft
        var lastDraft = prefix
        dictation.start(
            language = latestLanguage(),
            onText = { text ->
                if (!latestLiveVoice) {
                    val current = latestDraft
                    // Preserve edits typed while recognition was in progress.
                    if (current == prefix || current == lastDraft) {
                        lastDraft = Dictation.appendToDraft(prefix, text)
                        updateDraft(lastDraft)
                    }
                }
            },
            onFinal = { spoken ->
                silentTurns = 0
                if (latestLiveVoice) {
                    updateDraft("")
                    latestLiveFinal(spoken)
                }
            },
            onNoSpeech = {
                if (latestLiveVoice) {
                    silentTurns += 1
                    if (silentTurns >= 2) {
                        silentTurns = 0
                        latestLiveSilentStop()
                    } else {
                        scope.launch {
                            delay(350)
                            if (latestLiveVoice && !latestSending && !dictation.isActive) start()
                        }
                    }
                }
            },
        )
    }

    fun requestOrStart() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            silentTurns = 0
            start()
        } else {
            showingPermission = true
        }
    }

    val request = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { allowed ->
        denied = !allowed
        if (allowed) {
            silentTurns = 0
            start()
        } else {
            latestPermissionDenied()
        }
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
    LaunchedEffect(liveVoice) { if (!liveVoice) silentTurns = 0 }

    if (showingPermission) {
        AlertDialog(
            onDismissRequest = {
                showingPermission = false
                if (latestLiveVoice) latestPermissionDenied()
            },
            title = { Text(stringResource(R.string.voice_speak)) },
            text = { Text(stringResource(R.string.voice_permission_explanation)) },
            confirmButton = {
                TextButton(onClick = {
                    showingPermission = false
                    request.launch(Manifest.permission.RECORD_AUDIO)
                }) { Text(stringResource(R.string.voice_speak)) }
            },
            dismissButton = {
                TextButton(onClick = {
                    showingPermission = false
                    if (latestLiveVoice) latestPermissionDenied()
                }) {
                    Text(stringResource(R.string.action_cancel))
                }
            },
        )
    }
    return DictationControl(
        isListening = active,
        level = dictation.level,
        cancel = dictation::cancel,
        startListening = ::start,
        requestPermissionAndStart = ::requestOrStart,
        button = { enabled ->
            val label = stringResource(if (active) R.string.voice_stop else R.string.voice_speak)
            IconButton(
                onClick = {
                    if (active) {
                        if (dictation.state == DictationState.Listening) dictation.stop() else dictation.cancel()
                    } else {
                        requestOrStart()
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
                !liveVoice && dictation.state == DictationState.Listening -> R.string.voice_listening
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
