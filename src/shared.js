'use strict';

const EMOTES = ['idle', 'happy', 'suspicious', 'angry', 'confused', 'evil', 'smug', 'shocked', 'sad', 'love', 'annoyed'];
const STATE_KEYS = ['love', 'hate', 'anger', 'annoyance', 'ignorance'];
const clamp = (value) => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0));
const formatDuration = (ms) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
};

module.exports = { EMOTES, STATE_KEYS, clamp, formatDuration };
