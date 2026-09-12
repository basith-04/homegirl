'use strict';
const fs = require('fs'); const path = require('path');
class ConversationMemory {
  constructor(dataDir) { this.file = path.join(dataDir, 'conversation-memory.json'); this.entries = []; try { const saved = JSON.parse(fs.readFileSync(this.file, 'utf8')); this.entries = Array.isArray(saved.entries) ? saved.entries.slice(-100) : []; } catch {} }
  add(actor, text, trigger = null) { if (!text) return; this.entries.push({ actor, text, trigger, timestamp: Date.now() }); this.entries = this.entries.slice(-100); fs.mkdirSync(path.dirname(this.file), { recursive: true }); fs.writeFileSync(this.file, JSON.stringify({ entries: this.entries }, null, 2)); }
  recent() { return this.entries.map(({ actor, text, trigger, timestamp }) => ({ actor, text, trigger, timeAgo: `${Math.max(0, Math.floor((Date.now() - timestamp) / 1000))}s ago` })); }
}
module.exports = { ConversationMemory };
