'use strict';
const { formatDuration } = require('./shared');

function buildHomeGirlAIContext({ context, scheduler, trigger, recentInteractions = [], screen = null }) {
  const state = context.state || {}; const activity = context; const waiting = scheduler?.waiting || null; const schedulerDebug = scheduler?.debug ? scheduler.debug() : {};
  const payload = { homegirl: state, computer: { currentApp: activity.currentApp?.name || null, previousApp: activity.previousApp?.name || null, currentAppDuration: activity.currentAppDuration || null, switchesLast1m: activity.switchesLast1m || 0, switchesLast5m: activity.switchesLast5m || 0, recentApps: (activity.recentHistory || []).slice(-8), recentActivity: (activity.recentHistory || []).slice(-8) }, behavior: { trigger, patterns: (activity.patterns || []).map((p) => p.type), rapidSwitching: (activity.patterns || []).some((p) => p.type === 'RAPID_SWITCHING'), distractingAfterWork: (activity.patterns || []).some((p) => p.type === 'DISTRACTING_AFTER_WORK'), waitingForResponse: Boolean(waiting), responseDelay: waiting ? formatDuration(Date.now() - waiting.promptTimestamp) : null, ignoredPromptCount: (activity.pendingIgnoredPrompts || []).length, reactionsLast5m: schedulerDebug.reactionsLast5m || 0 }, pendingIgnoredPrompts: (activity.pendingIgnoredPrompts || []).slice(-10), screen: screen || null, recentHomeGirlInteraction: recentInteractions.slice(-8) };
  return `HOMEGIRL RUNTIME CONTEXT\n${JSON.stringify(payload, null, 2)}\n\nRespond in 1–2 short sentences. Use only the exact HomeGirl commands defined in your system instruction; never describe shell, JavaScript, or OS commands.`;
}
module.exports = { buildHomeGirlAIContext };
