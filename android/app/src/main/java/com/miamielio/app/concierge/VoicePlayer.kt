package com.miamielio.app.concierge

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.miamielio.app.core.SiteLocale
import com.miamielio.app.core.TtsClient
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.Locale

internal enum class PlaybackState { Idle, Loading, Speaking }

/**
 * Plays spoken ELIO+ replies (server ElevenLabs MP3 with Android TTS fallback).
 * Requests transient ducking AudioFocus so background music softens cleanly
 * while ELIO+ speaks, then releases focus immediately when finished or stopped.
 */
internal interface VoicePlayback {
    val state: PlaybackState
    val speakingEntryId: Long?

    fun speak(entryId: Long, text: String, locale: String, onEnded: (() -> Unit)? = null)
    fun stop()
    fun release()
}

internal class AndroidVoicePlayer(
    context: Context,
    private val ttsClient: TtsClient?,
    private val scope: CoroutineScope,
) : VoicePlayback {
    private val app = context.applicationContext
    private val audioManager = app.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    private val speechAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build()
    private val focusRequest: AudioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(speechAttributes)
        .setOnAudioFocusChangeListener { change ->
            if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                mainHandler.post { stop() }
            }
        }
        .build()
    private var hasAudioFocus = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private var fetchJob: Job? = null
    private var mediaPlayer: MediaPlayer? = null
    private var tempFile: File? = null
    private var systemTts: TextToSpeech? = null
    private var systemTtsReady = false
    private var generation = 0

    override var state by mutableStateOf(PlaybackState.Idle)
        private set

    override var speakingEntryId by mutableStateOf<Long?>(null)
        private set

    override fun speak(entryId: Long, text: String, locale: String, onEnded: (() -> Unit)?) {
        val clean = text.trim()
        if (clean.isEmpty()) return
        stop()
        val gen = ++generation
        speakingEntryId = entryId
        state = PlaybackState.Loading

        fetchJob = scope.launch {
            val mp3 = try {
                withContext(Dispatchers.IO) { ttsClient?.speak(clean, locale, fast = true) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                null
            }
            if (generation != gen) return@launch
            if (mp3 != null) {
                val started = playMp3(gen, mp3, onEnded)
                if (started) return@launch
            }
            if (generation != gen) return@launch
            speakWithSystemTts(gen, clean, locale, onEnded)
        }
    }

    override fun stop() {
        generation++
        fetchJob?.cancel()
        fetchJob = null
        releaseMedia()
        runCatching { systemTts?.stop() }
        abandonAudioFocus()
        state = PlaybackState.Idle
        speakingEntryId = null
    }

    override fun release() {
        stop()
        runCatching { systemTts?.shutdown() }
        systemTts = null
        systemTtsReady = false
    }

    private fun requestAudioFocus() {
        if (hasAudioFocus) return
        val granted = runCatching { audioManager?.requestAudioFocus(focusRequest) }.getOrNull()
        hasAudioFocus = granted == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }

    private fun abandonAudioFocus() {
        if (!hasAudioFocus) return
        hasAudioFocus = false
        runCatching { audioManager?.abandonAudioFocusRequest(focusRequest) }
    }

    private suspend fun playMp3(gen: Int, bytes: ByteArray, onEnded: (() -> Unit)?): Boolean {
        val file = try {
            withContext(Dispatchers.IO) {
                File(app.cacheDir, "elio_tts_$gen.mp3").apply { writeBytes(bytes) }
            }
        } catch (_: Exception) {
            return false
        }
        if (generation != gen) {
            runCatching { file.delete() }
            return false
        }
        tempFile = file
        return try {
            val player = MediaPlayer().apply {
                setAudioAttributes(speechAttributes)
                setDataSource(file.absolutePath)
                setOnPreparedListener { mp ->
                    mainHandler.post {
                        if (generation != gen) {
                            runCatching { mp.release() }
                            runCatching { file.delete() }
                            return@post
                        }
                        requestAudioFocus()
                        state = PlaybackState.Speaking
                        runCatching { mp.start() }.onFailure { finishPlayback(gen, invokeEnd = false, onEnded = null) }
                    }
                }
                setOnCompletionListener {
                    mainHandler.post { finishPlayback(gen, invokeEnd = true, onEnded = onEnded) }
                }
                setOnErrorListener { _, _, _ ->
                    mainHandler.post { finishPlayback(gen, invokeEnd = false, onEnded = null) }
                    true
                }
            }
            mediaPlayer = player
            player.prepareAsync()
            true
        } catch (_: Exception) {
            releaseMedia()
            false
        }
    }

    private fun speakWithSystemTts(gen: Int, text: String, locale: String, onEnded: (() -> Unit)?) {
        val invoke = { tts: TextToSpeech ->
            if (generation == gen) {
                runCatching {
                    requestAudioFocus()
                    tts.setAudioAttributes(speechAttributes)
                    tts.language = Locale.forLanguageTag(SiteLocale.speechLocale(locale))
                    val utteranceId = "elio-$gen"
                    tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                        override fun onStart(id: String?) {
                            mainHandler.post {
                                if (generation == gen) state = PlaybackState.Speaking
                            }
                        }

                        override fun onDone(id: String?) {
                            mainHandler.post { finishPlayback(gen, invokeEnd = true, onEnded = onEnded) }
                        }

                        @Suppress("OVERRIDE_DEPRECATION")
                        override fun onError(id: String?) {
                            mainHandler.post { finishPlayback(gen, invokeEnd = false, onEnded = null) }
                        }

                        override fun onError(utteranceId: String?, errorCode: Int) {
                            mainHandler.post { finishPlayback(gen, invokeEnd = false, onEnded = null) }
                        }
                    })
                    val result = tts.speak(text.take(TtsClient.maxTextLength), TextToSpeech.QUEUE_FLUSH, null, utteranceId)
                    if (result != TextToSpeech.SUCCESS) {
                        finishPlayback(gen, invokeEnd = false, onEnded = null)
                    }
                }.onFailure {
                    finishPlayback(gen, invokeEnd = false, onEnded = null)
                }
            }
        }

        val existing = systemTts
        if (existing != null && systemTtsReady) {
            invoke(existing)
            return
        }
        var created: TextToSpeech? = null
        created = runCatching {
            TextToSpeech(app) { status ->
                mainHandler.post {
                    val tts = created
                    if (status == TextToSpeech.SUCCESS && tts != null) {
                        systemTts = tts
                        systemTtsReady = true
                        invoke(tts)
                    } else {
                        finishPlayback(gen, invokeEnd = false, onEnded = null)
                    }
                }
            }
        }.getOrNull()
        if (created == null) {
            finishPlayback(gen, invokeEnd = false, onEnded = null)
        }
    }

    private fun finishPlayback(gen: Int, invokeEnd: Boolean, onEnded: (() -> Unit)?) {
        if (generation != gen) return
        releaseMedia()
        abandonAudioFocus()
        state = PlaybackState.Idle
        speakingEntryId = null
        if (invokeEnd) onEnded?.invoke()
    }

    private fun releaseMedia() {
        val player = mediaPlayer
        mediaPlayer = null
        if (player != null) {
            runCatching { if (player.isPlaying) player.stop() }
            runCatching { player.release() }
        }
        val file = tempFile
        tempFile = null
        if (file != null) runCatching { file.delete() }
    }
}
