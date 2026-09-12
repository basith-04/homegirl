'use strict';
const { formatDuration } = require('./shared');
class ContextManager {
  constructor(bus, tracker, state, ignored) { this.bus = bus; this.tracker = tracker; this.state = state; this.ignored = ignored; this.patterns = []; this.lastHomeGirlInterruptionAt = 0; bus.on('APP_CHANGED', (event) => this.analyze(event)); }
  analyze(event) {
    const snapshot = event.tracker; const now = event.timestamp;
    const add = (type, details = {}) => { this.patterns.push({ type, timestamp: now, ...details }); this.patterns = this.patterns.slice(-12); this.bus.emit(type, { source: event.source, timestamp: now, ...details, tracker: snapshot }); };
    if (snapshot.switchesLast1m >= 4) add('RAPID_SWITCHING', { count: snapshot.switchesLast1m });
    const history = snapshot.history;
    if (history.length >= 2 && history.at(-2).bundleId === event.app.bundleId) add('RETURNED_TO_APP', { app: event.app });
    const previous = event.previousApp;
    const distracting = /youtube|netflix|twitch|spotify/i.test(event.app.bundleId + event.app.name);
    const work = previous && /code|xcode|terminal|idea|figma/i.test((previous.bundleId || '') + (previous.name || ''));
    if (distracting && work) add('DISTRACTING_AFTER_WORK', { app: event.app, previousApp: previous });
    if (event.app.bundleId === 'com.apple.finder') add('DESKTOP_ACTIVATED', { app: event.app });
  }
  context() {
    const activity = this.tracker.snapshot(); const pending = this.ignored.pending(); const current = activity.currentApp;
    return { currentApp: current, previousApp: activity.previousApp, currentAppDuration: current ? formatDuration(current.durationMs) : '0s', recentHistory: activity.historyText, switchesLast1m: activity.switchesLast1m, switchesLast5m: activity.switchesLast5m, patterns: this.patterns.slice(-6), state: this.state.snapshot(), pendingIgnoredPrompts: pending.map((p) => p.text), capabilities: { screenUnderstanding: false } };
  }
}
module.exports = { ContextManager };
