package com.miamielio.app.concierge

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.miamielio.app.core.ConciergeClient
import com.miamielio.app.core.VoiceLevel

internal enum class DictationState { Idle, Listening, Finishing, Unavailable }

/** Owns a single recognizer. Call from the main thread and release on pause or disposal. */
internal class Dictation(context: Context) {
    private val app = context.applicationContext
    private var recognizer: SpeechRecognizer? = null
    var state by mutableStateOf(DictationState.Idle)
        private set
    var level by mutableStateOf(0.0)
        private set
    val isActive: Boolean get() = recognizer != null

    fun start(language: String, onText: (String) -> Unit) {
        if (isActive) return
        val engine = runCatching {
            if (Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(app)) {
                SpeechRecognizer.createOnDeviceSpeechRecognizer(app)
            } else if (SpeechRecognizer.isRecognitionAvailable(app)) {
                SpeechRecognizer.createSpeechRecognizer(app)
            } else {
                null
            }
        }.getOrNull()
        if (engine == null) {
            state = DictationState.Unavailable
            return
        }
        recognizer = engine
        state = DictationState.Listening
        try {
            engine.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) = Unit
                override fun onBeginningOfSpeech() = Unit
                override fun onBufferReceived(buffer: ByteArray?) = Unit
                override fun onEvent(eventType: Int, params: Bundle?) = Unit
                override fun onRmsChanged(rmsdB: Float) {
                    if (recognizer === engine && state == DictationState.Listening) level = VoiceLevel.fromRecognizer(rmsdB)
                }
                override fun onEndOfSpeech() {
                    if (recognizer === engine) state = DictationState.Finishing
                }
                override fun onError(error: Int) {
                    if (recognizer !== engine) return
                    finish(if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                        DictationState.Idle
                    } else {
                        DictationState.Unavailable
                    })
                }
                override fun onPartialResults(partialResults: Bundle?) {
                    if (recognizer === engine) partialResults.transcript()?.let(onText)
                }
                override fun onResults(results: Bundle?) {
                    if (recognizer !== engine) return
                    results.transcript()?.let(onText)
                    finish(DictationState.Idle)
                }
            })
            engine.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            })
        } catch (_: RuntimeException) {
            finish(DictationState.Unavailable)
        }
    }

    fun stop() {
        val engine = recognizer ?: return
        if (state != DictationState.Listening) return
        state = DictationState.Finishing
        try {
            engine.stopListening()
        } catch (_: RuntimeException) {
            finish(DictationState.Unavailable)
        }
    }

    fun cancel() = finish(DictationState.Idle)

    private fun finish(next: DictationState) {
        val engine = recognizer
        recognizer = null
        state = next
        level = 0.0
        engine?.let { runCatching(it::destroy) }
    }

    private fun Bundle?.transcript(): String? =
        this?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim()?.takeIf(String::isNotEmpty)

    companion object {
        fun appendToDraft(draft: String, transcript: String): String =
            ConciergeClient.clipped(listOf(draft.trimEnd(), transcript.trim()).filter(String::isNotEmpty).joinToString(" "))
    }
}
