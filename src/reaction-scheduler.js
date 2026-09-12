'use strict';
const { clamp } = require('./shared');

const POOLS = {
  CASUAL: ['Hmm.', 'Oh?', 'Look who’s back.', 'Interesting.', 'Right.'],
  SIDE_EYE: ['Sure.', 'That’s what we’re doing now?', 'Okay.', 'Noted.'],
  WINDOW_POLICE: ['PICK ONE.', 'WHY ARE WE SWITCHING?', 'Make up your mind.', 'Bro.', 'You’re just opening windows now.', 'What are you even doing?'],
  PRODUCTIVITY: ['You lasted {{duration}}.', 'Tutorial hell again?', 'You opened VS Code just to visit YouTube. Incredible.', 'Let me guess. “Research”?'],
  CLINGY: ['hello?', 'Bro?', 'Are you alive?', 'Talk to me.', 'Wow. Abandoned.', 'Okay wow.', 'Was I talking to myself?'],
  CHAOS: ['You’ve made this so much worse for yourself.', 'I was being nice.', 'Attention, please.', 'This is your fault.']
};

class ReactionScheduler {
  constructor(state) { this.state = state; this.reactions = []; this.lastLines = []; this.waiting = null; this.nudgeCount = 0; this.ignoredNudgesUntil = 2 + Math.floor(Math.random() * 3); this.metrics = { lastTrigger: null, lastReaction: null, currentMode: 'SILENT', lastProbability: 0, lastResponseDelayMs: 0, averageResponseDelayMs: 0, longestResponseDelayMs: 0, delayedResponseCount: 0, ignoredResponseCount: 0 }; }
  cooldownMs() { const annoyance = this.state.snapshot().annoyance; if (annoyance > 90) return 5_000 + Math.round(Math.random() * 10_000); if (annoyance > 60) return 10_000 + Math.round(Math.random() * 15_000); return 20_000 + Math.round(Math.random() * 20_000); }
  recent(ms) { const now = Date.now(); return this.reactions.filter((r) => r.at >= now - ms); }
  probability(priority) { const annoyance = this.state.snapshot().annoyance; const base = { LOW: 0.05, MEDIUM: 0.22, HIGH: 0.6 }[priority] || 0.05; let chance = base + (annoyance / 100) * 0.25; if (this.recent(5 * 60_000).length >= 5) chance *= 0.2; if (this.recent(15 * 60_000).length >= 9) chance *= 0.5; return Math.min(0.9, chance); }
  choose(pool) { const available = POOLS[pool].filter((line) => !this.lastLines.includes(line)); const line = (available.length ? available : POOLS[pool])[Math.floor(Math.random() * (available.length || POOLS[pool].length))]; this.lastLines = [...this.lastLines, line].slice(-3); return line; }
  consider(trigger, priority, details = {}) {
    const now = Date.now(); this.metrics.lastTrigger = trigger; const last = this.reactions.at(-1); const cooldown = this.cooldownMs(); const chance = this.probability(priority); this.metrics.lastProbability = chance;
    if (last && now - last.at < last.cooldownMs) return null;
    if (Math.random() >= chance && priority !== 'HIGH') return null;
    const annoyance = this.state.snapshot().annoyance; let mode = 'CASUAL'; let emote = 'idle'; let action = 'SHOW';
    if (annoyance > 90) { mode = 'CHAOS'; emote = 'evil'; action = ['CENTER_SCREEN', 'FOLLOW_CURSOR', 'FAKE_SCREEN_OFF', 'SHOW'][Math.floor(Math.random() * 4)]; }
    else if (trigger === 'RAPID_SWITCHING') { mode = 'WINDOW_POLICE'; emote = 'angry'; action = 'CENTER_SCREEN'; }
    else if (trigger === 'DISTRACTING_AFTER_WORK') { mode = 'PRODUCTIVITY'; emote = 'suspicious'; }
    else if (/RESPONSE_DELAY|REPEATED_IGNORE/.test(trigger)) { mode = 'CLINGY'; emote = 'annoyed'; action = 'CENTER_SCREEN'; }
    else if (annoyance > 50) { mode = 'SIDE_EYE'; emote = 'suspicious'; }
    let text = this.choose(mode); text = text.replace('{{duration}}', details.duration || '18 seconds');
    const reaction = { text, emote, action, priority: priority.toLowerCase(), mode, trigger, at: now, cooldownMs: cooldown };
    this.reactions.push(reaction); this.reactions = this.reactions.slice(-30); this.metrics.currentMode = mode; this.metrics.lastReaction = reaction; return reaction;
  }
  beginWaiting(promptText) { this.waiting = { promptId: `hg_${Date.now()}`, promptText, promptTimestamp: Date.now() }; this.nudgeCount = 0; this.ignoredNudgesUntil = 2 + Math.floor(Math.random() * 3); }
  recordIgnoredNudge() { this.nudgeCount++; if (this.nudgeCount < this.ignoredNudgesUntil) return false; this.metrics.ignoredResponseCount++; this.nudgeCount = 0; this.ignoredNudgesUntil = 2 + Math.floor(Math.random() * 3); return true; }
  respond() { if (!this.waiting) return null; const delay = Date.now() - this.waiting.promptTimestamp; const count = this.metrics.delayedResponseCount; this.metrics.lastResponseDelayMs = delay; this.metrics.longestResponseDelayMs = Math.max(this.metrics.longestResponseDelayMs, delay); this.metrics.averageResponseDelayMs = Math.round((this.metrics.averageResponseDelayMs * count + delay) / (count + 1)); if (delay >= 15_000) this.metrics.delayedResponseCount++; this.waiting = null; this.nudgeCount = 0; return delay; }
  checkResponseDelay() { if (!this.waiting) return null; const delay = Date.now() - this.waiting.promptTimestamp; if (delay < 15_000) return null; const priority = delay >= 60_000 ? 'HIGH' : 'MEDIUM'; return this.consider('LONG_RESPONSE_DELAY', priority, { duration: `${Math.floor(delay / 1000)} seconds` }); }
  debug() { const last = this.reactions.at(-1); return { ...this.metrics, waitingForUserResponse: Boolean(this.waiting), responseDelayMs: this.waiting ? Date.now() - this.waiting.promptTimestamp : 0, ignoredNudges: this.nudgeCount, ignoredNudgesUntil: this.ignoredNudgesUntil, reactionsLast5m: this.recent(300_000).length, reactionsLast15m: this.recent(900_000).length, globalCooldownRemainingMs: last ? Math.max(0, last.cooldownMs - (Date.now() - last.at)) : 0, chaosCooldownRemainingMs: this.state.snapshot().annoyance > 90 && last ? Math.max(0, 15_000 - (Date.now() - last.at)) : 0 }; }
}
module.exports = { ReactionScheduler };
