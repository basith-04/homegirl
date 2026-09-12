import AppKit
import Foundation

// Emits newline-delimited JSON. NSWorkspace posts real activation notifications;
// this helper intentionally does not inspect windows or screen contents.
final class ActivityReporter {
    private var current: [String: Any]?
    private var enteredAt = Date()

    init() {
        fputs("[HomeGirlActivityHelper] listening for NSWorkspace activation notifications\n", stderr)
        fflush(stderr)
        let center = NSWorkspace.shared.notificationCenter
        center.addObserver(self, selector: #selector(applicationActivated(_:)), name: NSWorkspace.didActivateApplicationNotification, object: nil)
        if let app = NSWorkspace.shared.frontmostApplication {
            current = applicationDictionary(app)
        }
    }

    @objc private func applicationActivated(_ notification: Notification) {
        guard let application = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication else { return }
        let now = Date()
        let payload: [String: Any] = [
            "type": "APP_CHANGED",
            "source": "macos",
            "timestamp": Int64(now.timeIntervalSince1970 * 1000),
            "app": applicationDictionary(application),
            "previousApp": current ?? NSNull(),
            "previousDurationMs": max(0, Int64(now.timeIntervalSince(enteredAt) * 1000))
        ]
        write(payload)
        current = applicationDictionary(application)
        enteredAt = now
    }

    private func applicationDictionary(_ app: NSRunningApplication) -> [String: Any] {
        [
            "name": app.localizedName ?? "Unknown App",
            "bundleId": app.bundleIdentifier ?? "unknown",
            // The Electron main process uses this same PID. It lets the parent
            // exclude only its own activated window without guessing by name.
            "pid": app.processIdentifier
        ]
    }

    private func write(_ payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let line = String(data: data, encoding: .utf8) else { return }
        print(line)
        fflush(stdout)
    }
}

// NSNotificationCenter does not guarantee retention of selector observers.
// Keep the reporter alive for the entire process lifetime so activation events
// continue to arrive after startup.
let reporter = ActivityReporter()
// A command-line AppKit process otherwise has no persistent run-loop source and
// can exit immediately. This timer only keeps the run loop alive; it does not
// inspect applications or perform polling.
Timer.scheduledTimer(withTimeInterval: 3600, repeats: true) { _ in }
RunLoop.main.run()
