'use strict';
const fs = require('fs'); const path = require('path'); const { clamp, STATE_KEYS } = require('./shared');
class StateManager {
  constructor(dataDir) { this.file = path.join(dataDir, 'state.json'); this.state = { love: 80, hate: 67, anger: 5, annoyance: 30, ignorance: 20 }; try { Object.assign(this.state, JSON.parse(fs.readFileSync(this.file, 'utf8'))); } catch {} this.normalize(); }
  normalize() { for (const key of STATE_KEYS) this.state[key] = clamp(this.state[key]); }
  set(key, value) { if (!STATE_KEYS.includes(key)) return false; this.state[key] = clamp(value); this.save(); return true; }
  snapshot() { return { ...this.state }; }
  save() { fs.mkdirSync(path.dirname(this.file), { recursive: true }); fs.writeFileSync(this.file, JSON.stringify(this.state, null, 2)); }
}
module.exports = { StateManager };
