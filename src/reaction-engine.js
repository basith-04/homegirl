'use strict';
const fs = require('fs'); const path = require('path'); const { resolve, validate } = require('./template-resolver');
class ReactionEngine {
  constructor(dataDir, contextManager) { this.file = path.join(dataDir, 'reactions.json'); this.contextManager = contextManager; try { this.reactions = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { this.reactions = []; } }
  save(template) { const context = this.templateContext(); const unknown = validate(template, context); if (unknown.length) { if (process.env.NODE_ENV === 'development') console.warn('Rejected reaction variables:', unknown); return { ok: false, unknown }; } const reaction = { id: `reaction_${Date.now()}`, template, tags: [], cooldownMs: 600000, conditions: [], lastUsedAt: null }; this.reactions.push(reaction); this.persist(); return { ok: true, reaction }; }
  templateContext() { const c = this.contextManager.context(); const appUsage = {}; for (const record of c.recentHistory) { const [name, duration] = record.split(/ (?=\d)/); appUsage[name.toLowerCase().replace(/[^a-z0-9]/g, '')] = { usetime: duration }; } return { app: { switchCount5m: c.switchesLast5m }, homegirl: { ignorecount: c.pendingIgnoredPrompts.length }, ...appUsage }; }
  select() { const now = Date.now(); const reaction = this.reactions.find((r) => !r.lastUsedAt || now - r.lastUsedAt >= r.cooldownMs); if (!reaction) return null; const result = resolve(reaction.template, this.templateContext()); if (!result.ok) return null; reaction.lastUsedAt = now; this.persist(); return result.text; }
  persist() { fs.mkdirSync(path.dirname(this.file), { recursive: true }); fs.writeFileSync(this.file, JSON.stringify(this.reactions, null, 2)); }
}
module.exports = { ReactionEngine };
