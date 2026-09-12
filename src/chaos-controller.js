'use strict';
// Non-destructive P1 behaviour. It is event-driven and deliberately rate-limited.
class ChaosController {
  constructor(state, actions, probability = 0.25, cooldownMs = 30_000) { this.state = state; this.actions = actions; this.probability = probability; this.cooldownMs = cooldownMs; this.lastAt = 0; }
  consider() { const now = Date.now(); if (this.state.snapshot().annoyance <= 90 || now - this.lastAt < this.cooldownMs || Math.random() >= this.probability) return null; const names = Object.keys(this.actions); const name = names[Math.floor(Math.random() * names.length)]; this.lastAt = now; this.actions[name](); return { name, timestamp: now }; }
}
module.exports = { ChaosController };
