package com.miamielio.app.concierge

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.miamielio.app.core.SiteLocale
import com.miamielio.app.core.VoiceLevel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Why the microphone could not be used. */
enum class VoiceNotice { Denied, Unavailable }

data class VoiceState(
    val isListening: Boolean = false,
    /** 0..1, how loud the guest is speaking, for the orb. */
    val level: Double = 0.0,
    val notice: VoiceNotice? = null,
)

/** Speech to text for the composer. An interface so screens can be tested without a microphone. */
interface Voice {
    val state: StateFlow<VoiceState>

    /** Starts listening in `language` (a site language code); `onWords` gets everything heard so far. */
    fun start(language: String, onWords: (String) -> Unit)

    /** Stops listening and keeps what was heard. */
    fun stop()

    /** Stops listening; nothing heard afterwards reaches the composer. */
    fun cancel()

    /** The guest refused the microphone. */
    fun denied()

    fun clearNotice()
}

/**
 * Dictation with the phone's own speech recogniser: on the device where the
 * phone can do that for the language, otherwise through the phone's default
 * recognition service. The words go into the composer for the guest to read
 * and send; the concierge never speaks its answers aloud.
 */
class Dictation(private val context: Context) : Voice {
    private val mutableState = MutableStateFlow(VoiceState())
    override val state: StateFlow<VoiceState> = mutableState.asStateFlow()

    private val main = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var onWords: ((String) -> Unit)? = null
    private var language = SiteLocale.fallback
    private var onDevice = false
    /** What earlier stretches of speech came to; the recogniser stops at each pause. */
    private var heard = ""
    private var deadline = 0L
    private val timeUp = Runnable { stop() }

    override fun start(language: String, onWords: (String) -> Unit) {
        cancel()
        this.language = language
        this.onWords = onWords
        heard = ""
        deadline = System.currentTimeMillis() + LIMIT_MILLIS
        mutableState.value = VoiceState()

        val canOnDevice = Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
        if (!canOnDevice && !SpeechRecognizer.isRecognitionAvailable(context)) {
            mutableState.value = VoiceState(notice = VoiceNotice.Unavailable)
            this.onWords = null
            return
        }
        onDevice = canOnDevice
        main.postDelayed(timeUp, LIMIT_MILLIS)
        listen()
    }

    override fun stop() = finish(notice = null)

    override fun cancel() {
        onWords = null
        finish(notice = null)
    }

    override fun denied() {
        onWords = null
        finish(notice = VoiceNotice.Denied)
    }

    override fun clearNotice() {
        mutableState.value = mutableState.value.copy(notice = null)
    }

    private fun finish(notice: VoiceNotice?) {
        main.removeCallbacks(timeUp)
        recognizer?.let { old ->
            old.setRecognitionListener(null)
            try {
                old.cancel()
                old.destroy()
            } catch (_: Exception) {
            }
        }
        recognizer = null
        onWords = null
        mutableState.value = VoiceState(notice = notice ?: mutableState.value.notice)
    }

    private fun listen() {
        val created = try {
            if (onDevice && Build.VERSION.SDK_INT >= 31) {
                SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
            } else {
                SpeechRecognizer.createSpeechRecognizer(context)
            }
        } catch (_: Exception) {
            null
        }
        if (created == null) {
            finish(VoiceNotice.Unavailable)
            return
        }
        recognizer?.destroy()
        recognizer = created
        created.setRecognitionListener(Listener())
        val request = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, SiteLocale.speechLocale(language))
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            .putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
        try {
            created.startListening(request)
            mutableState.value = VoiceState(isListening = true)
        } catch (_: Exception) {
            finish(VoiceNotice.Unavailable)
        }
    }

    private fun words(results: Bundle?): String =
        results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty().trim()

    private fun joined(latest: String): String = listOf(heard, latest).filter { it.isNotEmpty() }.joinToString(" ")

    private inner class Listener : RecognitionListener {
        override fun onPartialResults(partialResults: Bundle?) {
            val latest = words(partialResults)
            if (latest.isNotEmpty()) onWords?.invoke(joined(latest))
        }

        override fun onResults(results: Bundle?) {
            heard = joined(words(results))
            if (heard.isNotEmpty()) onWords?.invoke(heard)
            // The recogniser stops at a pause; keep listening until the guest
            // stops it or the minute is up.
            if (onWords != null && System.currentTimeMillis() < deadline) listen() else stop()
        }

        override fun onError(error: Int) {
            when (error) {
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> denied()
                SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED,
                SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE,
                SpeechRecognizer.ERROR_SERVER_DISCONNECTED,
                -> {
                    // The phone cannot hear this language by itself: try its
                    // default recognition service once before giving up.
                    if (onDevice && SpeechRecognizer.isRecognitionAvailable(context)) {
                        onDevice = false
                        listen()
                    } else {
                        finish(VoiceNotice.Unavailable)
                    }
                }
                // Silence, or nothing it could make out: just stop.
                else -> stop()
            }
        }

        override fun onRmsChanged(rmsdB: Float) {
            if (mutableState.value.isListening) {
                mutableState.value = mutableState.value.copy(level = VoiceLevel.fromRecognizer(rmsdB))
            }
        }

        override fun onReadyForSpeech(params: Bundle?) = Unit
        override fun onBeginningOfSpeech() = Unit
        override fun onBufferReceived(buffer: ByteArray?) = Unit
        override fun onEndOfSpeech() = Unit
        override fun onEvent(eventType: Int, params: Bundle?) = Unit
    }

    private companion object {
        /** A request, not a recording: the microphone goes off after a minute. */
        const val LIMIT_MILLIS = 60_000L
    }
}
