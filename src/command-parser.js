'use strict';
const { EMOTES } = require('./shared');
class CommandParser {
  constructor({ state, bus, reactions }) { this.state = state; this.bus = bus; this.reactions = reactions; }
  parse(input, { firstCommandOnly = false } = {}) {
    const visible = []; const commands = [];
    for (const raw of String(input || '').split(/\r?\n/)) {
      const line = raw.trim(); let match;
      if (firstCommandOnly && commands.length) { if (/^[A-Z_]+(?:\s*:\s*.*)?$/.test(line)) continue; visible.push(raw); continue; }
      if ((match = line.match(/^CHANGE(LOVE|HATE|ANGER|ANNOYANCE|IGNORANCE):\s*(-?\d+)$/i))) { const key = match[1].toLowerCase(); this.state.set(key, Number(match[2])); commands.push(`CHANGE${match[1]}`); continue; }
      if ((match = line.match(/^EMOTE:\s*([a-z]+)$/i))) { const name = match[1].toLowerCase(); if (EMOTES.includes(name)) { this.bus.emit('EMOTE', { name }); commands.push('EMOTE'); } continue; }
      if (/^RESPONDTOME$/i.test(line)) { this.bus.emit('RESPONDTOME', {}); commands.push('RESPONDTOME'); continue; }
      if (/^TAKEAPEEK$/i.test(line)) { this.bus.emit('TAKEAPEEK', {}); commands.push('TAKEAPEEK'); continue; }
      if (/^CAUSEBLACKOUT$/i.test(line)) { this.bus.emit('CAUSEBLACKOUT', {}); commands.push('CAUSEBLACKOUT'); continue; }
      if (/^FOLLOWMOUSE$/i.test(line)) { this.bus.emit('FOLLOWMOUSE', {}); commands.push('FOLLOWMOUSE'); continue; }
      if ((match = line.match(/^EVENT:(CENTER_SCREEN|FOLLOW_CURSOR|FAKE_SCREEN_OFF|REAPPEAR|SHOW|HIDE)$/i))) { this.bus.emit('HOMEGIRL_EVENT', { name: match[1] }); commands.push(`EVENT:${match[1]}`); continue; }
      if ((match = line.match(/^SAVE_REACTION:\s*["“](.+)["”]$/i))) { const saved = this.reactions.save(match[1]); commands.push(saved.ok ? 'SAVE_REACTION' : 'INVALID_REACTION'); continue; }
      if ((match = line.match(/^REACTION:\s*["“](.+)["”]$/i))) { const context = this.reactions.templateContext(); const result = require('./template-resolver').resolve(match[1], context); if (result.ok) visible.push(result.text); continue; }
      if (/^[A-Z_]+(?:\s*:\s*.*)?$/.test(line)) continue;
      visible.push(raw);
    }
    return { text: visible.join('\n').trim(), commands };
  }
}
module.exports = { CommandParser };
