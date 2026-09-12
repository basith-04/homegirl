'use strict';
const fs = require('fs'); const path = require('path');
class IgnoredPrompts {
  constructor(dataDir) { this.file = path.join(dataDir, 'ignored-prompts.json'); this.data = { pending: [], resolved: [] }; try { Object.assign(this.data, JSON.parse(fs.readFileSync(this.file, 'utf8'))); } catch {} }
  add(text, context) { const prompt = { id: `prompt_${Date.now()}`, timestamp: Date.now(), text, context, resolved: false }; this.data.pending.push(prompt); this.data.pending = this.data.pending.slice(-20); this.save(); return prompt; }
  pending() { return [...this.data.pending]; }
  resolveAll() { this.data.resolved.push(...this.data.pending.map((p) => ({ ...p, resolved: true }))); this.data.resolved = this.data.resolved.slice(-20); this.data.pending = []; this.save(); }
  save() { fs.mkdirSync(path.dirname(this.file), { recursive: true }); fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2)); }
}
module.exports = { IgnoredPrompts };
