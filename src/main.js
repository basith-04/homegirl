'use strict';
const { app, BrowserWindow, ipcMain, screen, powerMonitor } = require('electron');
const path = require('path'); const fs = require('fs'); const { spawn } = require('child_process');
// Load local development secrets only in the privileged main process. Existing
// shell environment values remain authoritative and nothing is exposed over IPC.
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch {}
const { EventBus } = require('./event-bus'); const { ActivityTracker } = require('./activity-tracker'); const { StateManager } = require('./state-manager'); const { IgnoredPrompts } = require('./ignored-prompts'); const { ContextManager } = require('./context-manager'); const { ReactionEngine } = require('./reaction-engine'); const { CommandParser } = require('./command-parser');
const { ChaosController } = require('./chaos-controller');
const { ReactionScheduler } = require('./reaction-scheduler');
const { GeminiService } = require('./gemini-service'); const { buildHomeGirlAIContext } = require('./homegirl-ai-context');
const { ConversationMemory } = require('./conversation-memory');

let avatarWindow; let debugWindow; let blackoutWindow; let helper; let followTimer; let blackoutTimer; let lastInterruptAt = 0; let longSessionBundleId = null;
const bus = new EventBus(); const dataDir = path.join(app.getPath('userData'), 'homegirl-data');
const tracker = new ActivityTracker(bus); const state = new StateManager(dataDir); const ignored = new IgnoredPrompts(dataDir); const context = new ContextManager(bus, tracker, state, ignored); const reactions = new ReactionEngine(dataDir, context); const parser = new CommandParser({ state, bus, reactions });
const scheduler = new ReactionScheduler(state);
const gemini = new GeminiService(); const conversationMemory = new ConversationMemory(dataDir); const recentInteractions = conversationMemory.recent();

// Stable, one-line stdout records make real and simulated activity easy to
// assert in integration tests without relying on the debug window.
function log(event, fields = {}) { console.log(`[HomeGirl] ${event} ${JSON.stringify({ timestamp: Date.now(), ...fields })}`); }

function avatarSend(channel, payload) { if (avatarWindow && !avatarWindow.isDestroyed()) avatarWindow.webContents.send(channel, payload); }
function dockAvatar() { if (!avatarWindow || avatarWindow.isDestroyed()) return; const area = screen.getPrimaryDisplay().workArea; const [width, height] = avatarWindow.getSize(); avatarWindow.setPosition(area.x + area.width - width - 18, area.y + area.height - height - 18); }
function debugSend() { const snapshot = { activity: tracker.snapshot(), context: context.context(), state: state.snapshot(), pending: ignored.pending(), scheduler: scheduler.debug(), gemini: gemini.snapshot(), lastEmote: global.lastEmote || 'idle', lastChaosEvent: global.lastChaosEvent || null, lastAiDecision: global.lastAiDecision || null }; avatarSend('homegirl:debug', snapshot); if (debugWindow && !debugWindow.isDestroyed()) debugWindow.webContents.send('homegirl:debug', snapshot); }
function createAvatar() {
  avatarWindow = new BrowserWindow({ width: 330, height: 600, frame: false, transparent: true, alwaysOnTop: true, resizable: false, hasShadow: false, skipTaskbar: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  avatarWindow.setAlwaysOnTop(true, 'floating'); avatarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); avatarWindow.loadFile(path.join(__dirname, 'avatar.html'));
  avatarWindow.webContents.on('did-finish-load', () => { dockAvatar(); debugSend(); });
}
function createDebug() {
  if (debugWindow && !debugWindow.isDestroyed()) return debugWindow.show();
  debugWindow = new BrowserWindow({ width: 460, height: 670, title: 'HomeGirl Debug', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  debugWindow.loadFile(path.join(__dirname, 'debug.html')); debugWindow.webContents.on('did-finish-load', debugSend);
}
const HomeGirl = {
  appear: () => avatarWindow?.showInactive(), disappear: () => avatarWindow?.hide(), say: (text) => avatarSend('homegirl:say', String(text)), setEmote: (name) => { global.lastEmote = name; avatarSend('homegirl:emote', name); },
  moveTo: (x, y) => avatarWindow?.setPosition(Math.round(x), Math.round(y)), moveRandomly: () => { const area = screen.getPrimaryDisplay().workArea; HomeGirl.moveTo(area.x + Math.random() * Math.max(1, area.width - 330), area.y + Math.random() * Math.max(1, area.height - 430)); },
  interrupt: () => { if (Date.now() - lastInterruptAt < 30_000) return; lastInterruptAt = Date.now(); HomeGirl.appear(); avatarWindow?.moveTop(); HomeGirl.moveRandomly(); },
  followCursor: () => { clearInterval(followTimer); let count = 0; followTimer = setInterval(() => { const p = screen.getCursorScreenPoint(); HomeGirl.moveTo(p.x - 150, p.y - 380); if (++count >= 8) clearInterval(followTimer); }, 450); },
  fakeScreenOff: () => {
    if (!blackoutWindow || blackoutWindow.isDestroyed()) {
      blackoutWindow = new BrowserWindow({ frame: false, transparent: false, fullscreen: true, alwaysOnTop: true, skipTaskbar: true, focusable: false, backgroundColor: '#050409', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
      blackoutWindow.loadFile(path.join(__dirname, 'blackout.html'));
    } else blackoutWindow.showInactive();
    clearTimeout(blackoutTimer); blackoutTimer = setTimeout(() => blackoutWindow && !blackoutWindow.isDestroyed() && blackoutWindow.hide(), 5 * 60_000);
  }
};
const chaos = new ChaosController(state, { reappear: HomeGirl.appear, centerScreen: () => { HomeGirl.appear(); avatarWindow?.center(); }, followCursor: HomeGirl.followCursor, angry: () => { HomeGirl.appear(); HomeGirl.setEmote('angry'); } });
function rememberInteraction(text, trigger, actor = 'homegirl') { conversationMemory.add(actor, text, trigger); recentInteractions.splice(0, recentInteractions.length, ...conversationMemory.recent()); }
function performLocalReaction(reaction) { if (!reaction) return; log('AUTO_REACTION', { mode: reaction.mode, trigger: reaction.trigger, action: reaction.action }); HomeGirl.setEmote(reaction.emote); const actions = { SHOW: HomeGirl.appear, CENTER_SCREEN: () => { HomeGirl.appear(); avatarWindow?.center(); }, FOLLOW_CURSOR: HomeGirl.followCursor, FAKE_SCREEN_OFF: HomeGirl.fakeScreenOff }; actions[reaction.action]?.(); HomeGirl.say(reaction.text); rememberInteraction(reaction.text, reaction.trigger); if (/\?|hello|Talk to me|Are you alive/i.test(reaction.text)) scheduler.beginWaiting(reaction.text); }
async function performAutomaticReaction(reaction) { if (!reaction) return; if (reaction.trigger === 'LONG_RESPONSE_DELAY' && scheduler.recordIgnoredNudge()) { const next = Math.min(100, state.snapshot().annoyance + 5 + Math.floor(Math.random() * 8)); state.set('annoyance', next); log('IGNORED_NUDGES_RAISED_ANNOYANCE', { annoyance: next }); } const runtimeContext = buildHomeGirlAIContext({ context: context.context(), scheduler, trigger: reaction.trigger, recentInteractions }); gemini.debug.contextSummary = `trigger=${reaction.trigger}; currentApp=${context.context().currentApp?.name || 'none'}; screen=unavailable`; avatarSend('homegirl:typing', true); log('[Gemini] request started', { trigger: reaction.trigger, currentApp: context.context().currentApp?.name }); try { const raw = await gemini.generateHomeGirlResponse({ context: runtimeContext }); const parsed = parser.parse(raw, { firstCommandOnly: true }); gemini.debug.lastCommandCount = parsed.commands.length; global.lastAiDecision = { commands: parsed.commands, text: parsed.text, provider: 'gemini' }; log('[Gemini] response received', { commands: parsed.commands.length }); if (parsed.text) { HomeGirl.say(parsed.text); rememberInteraction(parsed.text, reaction.trigger); if (reaction.trigger === 'LONG_RESPONSE_DELAY' || /\?|hello|Talk to me|Are you alive/i.test(parsed.text)) scheduler.beginWaiting(parsed.text); } } catch (error) { log('[Gemini] request failed', { message: error.message }); log('[Gemini] falling back to local reaction', { trigger: reaction.trigger }); performLocalReaction(reaction); } finally { avatarSend('homegirl:typing', false); debugSend(); } }
function startNativeBridge() {
  if (process.platform !== 'darwin') return console.warn('macOS activity tracking is unavailable on this platform.');
  const binary = path.join(__dirname, '..', 'build', 'homegirl-activity-helper');
  if (!fs.existsSync(binary)) return console.warn('Activity helper missing. Run npm run build:helper.');
  helper = spawn(binary, [], { stdio: ['ignore', 'pipe', 'pipe'] }); let buffer = '';
  log('NATIVE_BRIDGE_STARTED', { binary });
  helper.stdout.on('data', (chunk) => { buffer += chunk; const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (const line of lines) { try { const event = JSON.parse(line); log('NATIVE_ACTIVITY_RECEIVED', { source: event.source, app: event.app?.name, bundleId: event.app?.bundleId, pid: event.app?.pid, previousApp: event.previousApp?.name, previousDurationMs: event.previousDurationMs }); if (event.app?.pid !== process.pid) tracker.ingest(event); else log('NATIVE_ACTIVITY_IGNORED_SELF', { app: event.app?.name, pid: event.app?.pid }); } catch (error) { console.warn('Invalid activity helper event', error); } } });
  helper.stderr.on('data', (data) => console.warn('Activity helper:', data.toString())); helper.on('error', (error) => console.error('Could not start activity helper', error));
}
bus.on('APP_CHANGED', (activity) => { log('APP_CHANGED', { source: activity.source, app: activity.app?.name, previousApp: activity.previousApp?.name, previousDurationMs: activity.previousDurationMs }); const event = chaos.consider(); if (event) { global.lastChaosEvent = event.name; log('CHAOS_TRIGGERED', event); } performAutomaticReaction(scheduler.consider('APP_CHANGED', 'LOW')); debugSend(); });
function playSavedReaction() { const reaction = reactions.select(); if (reaction) { log('REACTION_SELECTED', { length: reaction.length }); HomeGirl.setEmote('smug'); HomeGirl.say(reaction); } }
bus.on('RAPID_SWITCHING', (event) => { log('RAPID_SWITCHING', { source: event.source, count: event.count }); performAutomaticReaction(scheduler.consider('RAPID_SWITCHING', 'HIGH')); playSavedReaction(); debugSend(); });
bus.on('DISTRACTING_AFTER_WORK', (event) => { log('DISTRACTING_AFTER_WORK', { source: event.source, app: event.app?.name }); performAutomaticReaction(scheduler.consider('DISTRACTING_AFTER_WORK', 'MEDIUM', { duration: context.context().currentAppDuration })); playSavedReaction(); debugSend(); });
bus.on('DESKTOP_ACTIVATED', () => performAutomaticReaction(scheduler.consider('DESKTOP_ACTIVATED', 'LOW')));
bus.on('EMOTE', (event) => { log('EMOTE', { name: event.name }); HomeGirl.setEmote(event.name); debugSend(); });
bus.on('RESPONDTOME', () => { HomeGirl.interrupt(); debugSend(); });
bus.on('TAKEAPEEK', () => { HomeGirl.say('I can’t peek at your screen without a screen provider. I am judging the app switching, though.'); });
bus.on('CAUSEBLACKOUT', () => { log('CAUSEBLACKOUT', {}); HomeGirl.fakeScreenOff(); debugSend(); });
bus.on('FOLLOWMOUSE', () => { log('FOLLOWMOUSE', {}); HomeGirl.followCursor(); debugSend(); });
bus.on('HOMEGIRL_EVENT', ({ name }) => { const map = { CENTER_SCREEN: () => avatarWindow?.center(), FOLLOW_CURSOR: HomeGirl.followCursor, FAKE_SCREEN_OFF: HomeGirl.fakeScreenOff, REAPPEAR: HomeGirl.appear, SHOW: HomeGirl.appear, HIDE: HomeGirl.disappear }; map[name]?.(); debugSend(); });
ipcMain.handle('homegirl:get-debug', () => ({ activity: tracker.snapshot(), context: context.context(), state: state.snapshot(), pending: ignored.pending(), scheduler: scheduler.debug(), gemini: gemini.snapshot(), lastEmote: global.lastEmote || 'idle', lastChaosEvent: global.lastChaosEvent || null }));
ipcMain.handle('homegirl:get-chat-history', () => conversationMemory.recent());
ipcMain.handle('homegirl:dismiss-blackout', () => { clearTimeout(blackoutTimer); blackoutWindow?.hide(); });
ipcMain.handle('homegirl:simulate', (_, appInfo) => { if (!appInfo || typeof appInfo.name !== 'string' || typeof appInfo.bundleId !== 'string') return; log('SIMULATION_INJECTED', { source: 'simulation', app: appInfo.name, bundleId: appInfo.bundleId }); tracker.ingest({ type: 'APP_CHANGED', source: 'simulation', timestamp: Date.now(), app: appInfo }); });
ipcMain.handle('homegirl:user-message', async (_, text) => { if (typeof text !== 'string' || !text.trim()) return { ignored: false }; rememberInteraction(text.trim(), 'USER_MESSAGE', 'user'); const responseDelay = scheduler.respond(); const chance = state.snapshot().ignorance / 100; if (Math.random() < chance) { ignored.add(text.trim(), context.context()); bus.emit('HOMEGIRL_IGNORED', { source: 'user', text }); log('USER_MESSAGE_IGNORED', { pendingCount: ignored.pending().length, textLength: text.trim().length }); debugSend(); return { ignored: true }; } ignored.resolveAll(); const runtimeContext = `${buildHomeGirlAIContext({ context: context.context(), scheduler, trigger: 'USER_MESSAGE', recentInteractions })}\n\nUSER MESSAGE: ${text.trim()}`; avatarSend('homegirl:typing', true); try { const raw = await gemini.generateHomeGirlResponse({ context: runtimeContext }); const parsed = parser.parse(raw, { firstCommandOnly: true }); gemini.debug.lastCommandCount = parsed.commands.length; if (parsed.text) { HomeGirl.appear(); HomeGirl.say(parsed.text); rememberInteraction(parsed.text, 'USER_MESSAGE'); if (/\?|hello|Talk to me|Are you alive/i.test(parsed.text)) scheduler.beginWaiting(parsed.text); } } catch (error) { log('[Gemini] request failed', { message: error.message }); HomeGirl.appear(); HomeGirl.setEmote('smug'); const fallback = responseDelay >= 15_000 ? 'Oh NOW you answer.' : `Oh, NOW we're talking. ${text.trim()}`; HomeGirl.say(fallback); rememberInteraction(fallback, 'USER_MESSAGE'); } finally { avatarSend('homegirl:typing', false); } debugSend(); return { ignored: false }; });
ipcMain.handle('homegirl:parse-ai', (_, text) => { const result = parser.parse(text); global.lastAiDecision = { commands: result.commands, text: result.text }; log('AI_DECISION_PARSED', { commands: result.commands, visibleTextLength: result.text.length }); if (result.text) HomeGirl.say(result.text); debugSend(); return result; });
ipcMain.handle('homegirl:control', (_, action) => { const safe = { 'raise-annoyance': () => state.set('annoyance', state.snapshot().annoyance + 15), 'trigger-emote': () => bus.emit('EMOTE', { name: 'angry' }), 'trigger-chaos': () => { global.lastChaosEvent = 'simulation: follow cursor'; HomeGirl.followCursor(); }, 'take-a-peek': () => bus.emit('TAKEAPEEK', {}) }; safe[action]?.(); debugSend(); });
app.whenReady().then(() => { createAvatar(); if (process.env.NODE_ENV !== 'production') createDebug(); startNativeBridge(); setInterval(() => { performAutomaticReaction(scheduler.checkResponseDelay()); const current = tracker.snapshot().currentApp; if (current?.durationMs >= 5 * 60_000 && current.bundleId !== longSessionBundleId) { longSessionBundleId = current.bundleId; performAutomaticReaction(scheduler.consider('LONG_APP_SESSION', 'MEDIUM', { duration: context.context().currentAppDuration })); } if (current?.durationMs < 5 * 60_000) longSessionBundleId = null; debugSend(); }, 1000); let wasIdle = false; setInterval(() => { const idle = powerMonitor.getSystemIdleState(60) !== 'active'; if (idle && !wasIdle) bus.emit('IDLE_PERIOD', { source: 'macos', timestamp: Date.now() }); if (!idle && wasIdle) bus.emit('RETURNED_AFTER_IDLE', { source: 'macos', timestamp: Date.now() }); wasIdle = idle; }, 15_000); });
app.on('window-all-closed', (event) => { if (process.platform === 'darwin') event.preventDefault(); }); app.on('before-quit', () => helper?.kill());
