import AVFoundation
import Observation
import Speech
import MiamiElioKit

/// Speaking a request instead of typing it. The words appear in the
/// composer as they are heard; the guest reads them and sends. Nothing is
/// spoken back: the concierge answers in text, as it does on the website.
@MainActor
@Observable
final class Dictation {
    enum Notice: Equatable {
        /// The microphone or speech recognition is turned off in Settings.
        case denied
        /// This iPhone cannot hear this language right now.
        case unavailable
    }

    private(set) var isListening = false
    /// How loud the guest is, 0...1, for the orb.
    private(set) var level: Double = 0
    var notice: Notice?

    @ObservationIgnored private var capture: SpeechCapture?
    @ObservationIgnored private var write: ((String) -> Void)?
    @ObservationIgnored private var starting = false
    /// Each listen gets a number; whatever an earlier one still reports is dropped.
    @ObservationIgnored private var round = 0
    @ObservationIgnored private var reader: Task<Void, Never>?
    @ObservationIgnored private var limit: Task<Void, Never>?

    /// Starts listening in `language`, a site language code. `write` gets
    /// everything heard so far, each time it grows.
    func start(language: String, write: @escaping (String) -> Void) {
        guard !isListening, !starting else { return }
        starting = true
        notice = nil
        Task {
            defer { starting = false }
            guard await Self.permitted() else {
                notice = .denied
                return
            }
            guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: SiteLocale.speechLocale(language))),
                  recognizer.isAvailable
            else {
                notice = .unavailable
                return
            }

            round += 1
            let current = round
            let capture = SpeechCapture()
            let events: AsyncStream<SpeechCapture.Event>
            do {
                events = try capture.start(with: recognizer)
            } catch {
                capture.cancel()
                notice = .unavailable
                return
            }
            self.capture = capture
            self.write = write
            isListening = true

            reader = Task { [weak self] in
                for await event in events {
                    guard let self, self.round == current else { return }
                    self.receive(event)
                }
            }
            // A microphone left on by mistake does not stay on.
            limit = Task { [weak self] in
                try? await Task.sleep(for: .seconds(60))
                guard !Task.isCancelled else { return }
                self?.stop()
            }
        }
    }

    /// Stops listening. The last words still arrive.
    func stop() {
        guard isListening else { return }
        isListening = false
        level = 0
        limit?.cancel()
        limit = nil
        capture?.finish()
    }

    /// Stops and drops anything still on its way: the request was sent, or
    /// the guest left the screen.
    func cancel() {
        round += 1
        isListening = false
        level = 0
        limit?.cancel()
        limit = nil
        reader?.cancel()
        reader = nil
        capture?.cancel()
        capture = nil
        write = nil
    }

    private func receive(_ event: SpeechCapture.Event) {
        switch event {
        case .level(let value):
            if isListening {
                level = value
            }
        case .words(let words):
            write?(words)
        case .ended:
            cancel()
        }
    }

    /// Asks once for speech recognition and the microphone; afterwards
    /// answers from what the guest chose. Not tied to the main actor: the
    /// system answers the first question on a queue of its own.
    nonisolated private static func permitted() async -> Bool {
        var speech = SFSpeechRecognizer.authorizationStatus()
        if speech == .notDetermined {
            speech = await withCheckedContinuation { continuation in
                SFSpeechRecognizer.requestAuthorization { status in
                    continuation.resume(returning: status)
                }
            }
        }
        guard speech == .authorized else { return false }
        return await AVAudioApplication.requestRecordPermission()
    }
}

/// The microphone and the recognizer, without any screen. Sound arrives on
/// an audio thread and recognition results on a queue of the recognizer's
/// own; both are handed on as events in one stream, which the owner reads
/// on the main actor.
final class SpeechCapture {
    enum Event: Sendable {
        case level(Double)
        /// Everything heard so far.
        case words(String)
        case ended
    }

    enum Failure: Error {
        /// No microphone to listen with, as on the simulator.
        case noMicrophone
    }

    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var tapped = false

    func start(with recognizer: SFSpeechRecognizer) throws -> AsyncStream<Event> {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.record, mode: .measurement, options: .duckOthers)
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else {
            throw Failure.noMicrophone
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.addsPunctuation = true
        // Heard on the phone itself wherever it can be, so the sound never leaves it.
        if recognizer.supportsOnDeviceRecognition {
            request.requiresOnDeviceRecognition = true
        }
        self.request = request

        // Loudness arrives dozens of times a second; if the reader falls
        // behind, only the latest matters. The words always carry the whole
        // text so far, so a skipped one loses nothing.
        let (events, continuation) = AsyncStream.makeStream(of: Event.self, bufferingPolicy: .bufferingNewest(32))

        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
            continuation.yield(.level(Self.loudness(of: buffer)))
        }
        tapped = true
        engine.prepare()
        try engine.start()

        task = recognizer.recognitionTask(with: request) { result, error in
            if let result {
                continuation.yield(.words(result.bestTranscription.formattedString))
            }
            if error != nil || result?.isFinal == true {
                continuation.yield(.ended)
                continuation.finish()
            }
        }
        return events
    }

    /// Stops hearing. The recognizer still delivers what it heard.
    func finish() {
        if engine.isRunning {
            engine.stop()
        }
        if tapped {
            engine.inputNode.removeTap(onBus: 0)
            tapped = false
        }
        request?.endAudio()
    }

    /// Stops hearing and recognizing, and hands the sound back to other apps.
    func cancel() {
        finish()
        task?.cancel()
        task = nil
        request = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private static func loudness(of buffer: AVAudioPCMBuffer) -> Double {
        guard let samples = buffer.floatChannelData?[0], buffer.frameLength > 0 else { return 0 }
        let count = Int(buffer.frameLength)
        var sum: Float = 0
        for index in 0..<count {
            sum += samples[index] * samples[index]
        }
        return VoiceLevel.normalized(rms: (sum / Float(count)).squareRoot())
    }
}
