'use strict';
class EventBus {
  constructor() { this.listeners = new Map(); }
  on(type, listener) { const set = this.listeners.get(type) || new Set(); set.add(listener); this.listeners.set(type, set); return () => set.delete(listener); }
  emit(type, payload = {}) { for (const listener of this.listeners.get(type) || []) { try { listener({ type, ...payload }); } catch (error) { console.error(`Event listener failed (${type})`, error); } } }
}
module.exports = { EventBus };
