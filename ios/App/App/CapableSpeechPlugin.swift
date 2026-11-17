import Foundation
import Capacitor
import Speech
import AVFoundation
import UIKit
import WebKit

/// Capable's small native bridge: on-device speech recognition, read-aloud
/// with the system voices, and keep-screen-on.
///
/// Privacy rule enforced here, not just described: recognition ONLY runs with
/// `requiresOnDeviceRecognition = true`. If the device cannot recognise
/// English on-device, `available` says so and `start` refuses — there is no
/// fallback to Apple's server-based recognition.
@objc(CapableSpeechPlugin)
public class CapableSpeechPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    public let identifier = "CapableSpeechPlugin"
    public let jsName = "CapableSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "voices", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSpeaking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setKeepAwake", returnType: CAPPluginReturnPromise)
    ]

    private let audioEngine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var silenceTimer: Timer?
    private var maxTimer: Timer?
    private var lastTranscript = ""
    private var delivered = false

    private let synth = AVSpeechSynthesizer()
    private var speakCall: CAPPluginCall?
    private var lastVoiceQuality = "default"

    override public func load() {
        synth.delegate = self
        let nc = NotificationCenter.default
        nc.addObserver(self, selector: #selector(onInterruption(_:)), name: AVAudioSession.interruptionNotification, object: nil)
        nc.addObserver(self, selector: #selector(onBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
    }

    private func makeRecognizer(_ lang: String) -> SFSpeechRecognizer? {
        if recognizer?.locale.identifier != lang { recognizer = SFSpeechRecognizer(locale: Locale(identifier: lang)) }
        return recognizer
    }

    // MARK: availability and permissions

    @objc func available(_ call: CAPPluginCall) {
        let lang = call.getString("lang") ?? "en-AU"
        guard let r = makeRecognizer(lang) else {
            call.resolve(["recognition": false, "onDevice": false, "reason": "unsupported"]); return
        }
        if !r.supportsOnDeviceRecognition {
            call.resolve(["recognition": false, "onDevice": false, "reason": "no-on-device"]); return
        }
        call.resolve(["recognition": r.isAvailable, "onDevice": true, "reason": r.isAvailable ? NSNull() : "busy"])
    }

    private func micState() -> String {
        if #available(iOS 17.0, *) {
            switch AVAudioApplication.shared.recordPermission {
            case .granted: return "granted"
            case .denied: return "denied"
            default: return "prompt"
            }
        }
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted: return "granted"
        case .denied: return "denied"
        default: return "prompt"
        }
    }

    private func speechState() -> String {
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized: return "granted"
        case .denied, .restricted: return "denied"
        default: return "prompt"
        }
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["microphone": micState(), "speechRecognition": speechState()])
    }

    /// Asks only when the person presses "Speak" — never at launch.
    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { _ in
            let finish = { call.resolve(["microphone": self.micState(), "speechRecognition": self.speechState()]) }
            if #available(iOS 17.0, *) {
                AVAudioApplication.requestRecordPermission { _ in finish() }
            } else {
                AVAudioSession.sharedInstance().requestRecordPermission { _ in finish() }
            }
        }
    }

    // MARK: recognition

    @objc func start(_ call: CAPPluginCall) {
        let lang = call.getString("lang") ?? "en-AU"
        guard let r = makeRecognizer(lang) else { call.reject("Speech recognition is not supported", "unsupported"); return }
        guard r.supportsOnDeviceRecognition else { call.reject("On-device recognition is not available", "no-on-device"); return }
        guard speechState() == "granted", micState() == "granted" else { call.reject("Permission denied", "not-allowed"); return }
        guard r.isAvailable else { call.reject("Recogniser busy", "busy"); return }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { call.reject("Plugin unloaded", "error"); return }
            self.stopRecognition(notify: false)
            if self.synth.isSpeaking { self.synth.stopSpeaking(at: .immediate) }
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker])
                try session.setActive(true, options: .notifyOthersOnDeactivation)

                let req = SFSpeechAudioBufferRecognitionRequest()
                req.requiresOnDeviceRecognition = true   // the privacy guarantee
                req.shouldReportPartialResults = true
                self.request = req
                self.lastTranscript = ""
                self.delivered = false

                let input = self.audioEngine.inputNode
                let format = input.outputFormat(forBus: 0)
                guard format.sampleRate > 0 else { call.reject("No microphone", "audio-capture"); return }
                input.removeTap(onBus: 0)
                input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in req.append(buffer) }
                self.audioEngine.prepare()
                try self.audioEngine.start()

                self.task = r.recognitionTask(with: req) { [weak self] result, error in
                    guard let self = self else { return }
                    if let result = result {
                        self.lastTranscript = result.bestTranscription.formattedString
                        if result.isFinal { self.deliver(); return }
                        DispatchQueue.main.async { self.armSilenceTimer() }
                    }
                    if let error = error as NSError? {
                        if !self.lastTranscript.isEmpty { self.deliver(); return }
                        // 1110: no speech detected; 203/216: cancelled by us
                        let code: String
                        switch error.code {
                        case 1110: code = "no-speech"
                        case 203, 216, 301: code = "cancelled"
                        default: code = "error"
                        }
                        DispatchQueue.main.async {
                            self.stopRecognition(notify: false)
                            if code != "cancelled" { self.notifyListeners("error", data: ["code": code]) }
                            self.notifyListeners("end", data: [:])
                        }
                    }
                }
                // Stop after 10 seconds regardless, so the mic is never left open.
                self.maxTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: false) { [weak self] _ in self?.request?.endAudio() }
                call.resolve(["listening": true])
            } catch {
                self.stopRecognition(notify: false)
                call.reject("Could not start the microphone", "audio-capture")
            }
        }
    }

    private func armSilenceTimer() {
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(withTimeInterval: 1.4, repeats: false) { [weak self] _ in self?.request?.endAudio() }
    }

    private func deliver() {
        DispatchQueue.main.async {
            if self.delivered { return }
            self.delivered = true
            let text = self.lastTranscript
            self.stopRecognition(notify: false)
            if !text.isEmpty { self.notifyListeners("result", data: ["text": text]) }
            else { self.notifyListeners("error", data: ["code": "no-speech"]) }
            self.notifyListeners("end", data: [:])
        }
    }

    private func stopRecognition(notify: Bool) {
        silenceTimer?.invalidate(); silenceTimer = nil
        maxTimer?.invalidate(); maxTimer = nil
        if audioEngine.isRunning { audioEngine.stop() }
        audioEngine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        task?.cancel()
        task = nil
        request = nil
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        if notify { notifyListeners("end", data: [:]) }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.delivered = true
            self.stopRecognition(notify: true)
            call.resolve()
        }
    }

    @objc private func onInterruption(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              AVAudioSession.InterruptionType(rawValue: raw) == .began else { return }
        DispatchQueue.main.async {
            let wasListening = self.task != nil
            if wasListening {
                self.delivered = true
                self.stopRecognition(notify: false)
                self.notifyListeners("error", data: ["code": "interrupted"])
                self.notifyListeners("end", data: [:])
            }
            if self.synth.isSpeaking { self.synth.stopSpeaking(at: .immediate) }
        }
    }

    @objc private func onBackground() {
        DispatchQueue.main.async {
            if self.task != nil { self.delivered = true; self.stopRecognition(notify: true) }
            if self.synth.isSpeaking { self.synth.stopSpeaking(at: .immediate) }
        }
    }

    // MARK: read aloud (always on-device system voices)

    private func qualityName(_ v: AVSpeechSynthesisVoice) -> String {
        if #available(iOS 16.0, *), v.quality == .premium { return "premium" }
        return v.quality == .enhanced ? "enhanced" : "default"
    }

    /// Quality first, then accent. A compact Australian voice sounds far more
    /// robotic than an Enhanced or Premium British/American one, so: Premium
    /// en-AU > Premium English > Enhanced en-AU > Enhanced English > default
    /// en-AU. Novelty and "eloquence" voices are excluded.
    private func bestVoice(_ lang: String) -> AVSpeechSynthesisVoice? {
        let english = AVSpeechSynthesisVoice.speechVoices().filter {
            $0.language.hasPrefix("en") && !$0.identifier.contains("speech.synthesis") && !$0.identifier.contains("eloquence")
        }
        func rank(_ v: AVSpeechSynthesisVoice) -> Int {
            let q = qualityName(v)
            let local = v.language == lang ? 1 : 0
            let accent = ["en-AU": 3, "en-GB": 2, "en-NZ": 2, "en-IE": 1, "en-US": 1][v.language] ?? 0
            return (q == "premium" ? 300 : q == "enhanced" ? 200 : 0) + local * 50 + accent * 10
        }
        let best = english.max(by: { rank($0) < rank($1) })
        if let b = best, qualityName(b) != "default" { return b }
        return AVSpeechSynthesisVoice(language: lang) ?? best
    }

    /// Diagnostic: the English voices installed on this device.
    @objc func voices(_ call: CAPPluginCall) {
        let list = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix("en") }.map {
            ["name": $0.name, "language": $0.language, "quality": qualityName($0), "identifier": $0.identifier]
        }
        let chosen = bestVoice(call.getString("lang") ?? "en-AU")
        call.resolve(["voices": list, "chosen": chosen.map { ["name": $0.name, "language": $0.language, "quality": qualityName($0)] } ?? [:]])
    }

    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else { call.reject("No text", "no-text"); return }
        let lang = call.getString("lang") ?? "en-AU"
        let rate = Float(call.getDouble("rate") ?? Double(AVSpeechUtteranceDefaultSpeechRate))
        DispatchQueue.main.async {
            if let previous = self.speakCall { previous.resolve(["finished": false]); self.speakCall = nil }
            if self.synth.isSpeaking { self.synth.stopSpeaking(at: .immediate) }
            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try? AVAudioSession.sharedInstance().setActive(true)
            let u = AVSpeechUtterance(string: text)
            let voice = self.bestVoice(lang)
            u.voice = voice
            // If the person has chosen a voice in Settings > Accessibility >
            // Spoken Content, use theirs instead of ours.
            if #available(iOS 14.0, *) { u.prefersAssistiveTechnologySettings = true }
            self.lastVoiceQuality = voice.map { self.qualityName($0) } ?? "default"
            u.rate = max(AVSpeechUtteranceMinimumSpeechRate, min(AVSpeechUtteranceMaximumSpeechRate, rate))
            self.speakCall = call
            self.synth.speak(u)
        }
    }

    @objc func stopSpeaking(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.synth.stopSpeaking(at: .immediate)
            call.resolve()
        }
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        speakCall?.resolve(["finished": true, "voiceQuality": lastVoiceQuality]); speakCall = nil
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        speakCall?.resolve(["finished": false, "voiceQuality": lastVoiceQuality]); speakCall = nil
    }

    // MARK: keep screen on

    @objc func setKeepAwake(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = on
            call.resolve(["on": on])
        }
    }
}

/// Registers the local plugin with the bridge.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CapableSpeechPlugin())
        // The band behind the status bar shows the web view's own background,
        // so match the page's --bg token in both light and dark appearance.
        let bg = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 0x1A / 255.0, green: 0x1A / 255.0, blue: 0x18 / 255.0, alpha: 1)
                : UIColor(red: 0xF7 / 255.0, green: 0xF6 / 255.0, blue: 0xF2 / 255.0, alpha: 1)
        }
        view.backgroundColor = bg
        webView?.isOpaque = false
        webView?.backgroundColor = bg
        webView?.scrollView.backgroundColor = bg
        #if DEBUG
        // Test hook, compiled out of release builds: `simctl launch` can pass a
        // script in SIMCTL_CHILD_CAPABLE_SELFTEST_JS to run inside the real
        // WKWebView. Nothing is injected unless that variable is set.
        if let js = ProcessInfo.processInfo.environment["CAPABLE_SELFTEST_JS"], !js.isEmpty {
            let script = WKUserScript(source: js, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
            webView?.configuration.userContentController.addUserScript(script)
        }
        #endif
    }
}
