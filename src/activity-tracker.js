'use strict';
const { formatDuration } = require('./shared');

class ActivityTracker {
  constructor(bus) { this.bus = bus; this.current = null; this.previous = null; this.history = []; this.switches = []; this.lastEvent = null; }
  ingest(event) {
    if (!event || event.type !== 'APP_CHANGED' || !event.app?.bundleId) return;
    const timestamp = Number(event.timestamp) || Date.now();
    if (this.current?.bundleId === event.app.bundleId) return;
    const previousDurationMs = this.current ? Math.max(0, timestamp - this.current.enteredAt) : Math.max(0, Number(event.previousDurationMs) || 0);
    if (this.current) this.history.push({ app: this.current.name, bundleId: this.current.bundleId, enteredAt: this.current.enteredAt, durationMs: previousDurationMs, source: this.current.source });
    this.history = this.history.slice(-20);
    this.previous = this.current ? { ...this.current, durationMs: previousDurationMs } : event.previousApp || null;
    this.current = { name: event.app.name || 'Unknown App', bundleId: event.app.bundleId, enteredAt: timestamp, source: event.source || 'macos' };
    this.switches.push(timestamp); this.switches = this.switches.filter((at) => at >= timestamp - 5 * 60_000);
    this.lastEvent = { ...event, timestamp, previousDurationMs };
    this.bus.emit('APP_CHANGED', { ...this.lastEvent, tracker: this.snapshot(timestamp) });
  }
  snapshot(now = Date.now()) {
    const countSince = (ms) => this.switches.filter((at) => at >= now - ms).length;
    return { currentApp: this.current && { name: this.current.name, bundleId: this.current.bundleId, durationMs: Math.max(0, now - this.current.enteredAt), source: this.current.source }, previousApp: this.previous, history: this.history.map((record) => ({ ...record })), switchesLast1m: countSince(60_000), switchesLast5m: countSince(300_000), switchCount: this.switches.length, lastEvent: this.lastEvent, historyText: this.history.map((r) => `${r.app} ${formatDuration(r.durationMs)}`) };
  }
}
module.exports = { ActivityTracker };
