<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />

# HomeGirl 🎯

An affectionate, clingy, shamelessly annoying desktop companion for macOS. She watches what you do, judges your app-switching, gets offended when you ignore her, and can make the screen go black just to mess with you.

## Basic Details

### Team Name: [Name]

### Team Members
- Team Lead: [Name] - [College]
- Member 2: [Name] - [College]
- Member 3: [Name] - [College]

### Project Description
HomeGirl is a translucent, always-on-top AI companion that lives on your desktop. She tracks your active apps on macOS, reacts to your work-and-slack-off habits, and talks back with real AI-generated personality — an extremely close friend who has absolutely no respect for your desire to be left alone.

### The Problem (that doesn't exist)
Every productivity tool desperately tries to help you focus. No one was guarding you against the *real* problem: a close friend who refuses to leave you alone while you "just quickly check YouTube" for the fourth time today.

### The Solution (that nobody asked for)
A desktop gremlin with a 0-to-100 emotional state (love, hate, anger, annoyance, ignorance) who scores every window you switch to, roasts you for tutorial hell, throws fake screen-off tantrums, and follows your mouse around until you acknowledge her.

## Technical Details

### Technologies/Components Used

For Software:
- Electron 37 — always-on-top avatar window, chat UI, blackout overlay
- Node.js (CommonJS) — main process, renderer, preload, IPC
- Swift + AppKit — native `NSWorkspace` activity helper emitting newline-delimited JSON
- Google Gemini (`@google/genai`) — personality generation via the Interactions API
- Vanilla JS + CSS in the renderer — no frontend framework

### Implementation

For Software:

# Installation
```bash
npm install
export GEMINI_API_KEY="your-key"  # optional; HomeGirl falls back to local reactions without it
export GEMINI_MODEL="models/gemini-3.6-flash"  # optional override
```

# Run
```bash
npm start
```

`npm start` compiles the Swift activity helper into `build/` first, then launches Electron. On Linux/Windows the native tracker is skipped gracefully and the app still runs.

Place the HomeGirl persona in `HG.AI.md` at the repository root. Gemini reads this file for every request, so persona changes require no rebuild. Keep the API key in the environment or `.env` — never in this file, the renderer, or source control.

# Scripts
- `npm start` — build native helper, then launch
- `npm run dev` — launch with `NODE_ENV=development` (debug window included)
- `npm test` — run the unit test suite (`node --test`)
- `npm run typecheck` — syntax-check all main-process modules
- `npm run extract:emotes` — re-crop the emote sprite sheet from `image.jpg`
- `npm run build:helper` — compile `native/HomeGirlActivityHelper.swift` with `swiftc` (macOS only)

# How it works

A Swift helper subscribes to `NSWorkspace.didActivateApplicationNotification` and streams app-activation JSON to the Electron main process. The activity tracker turns that into rolling switch stats, and a context manager detects behavioral patterns:

- **RAPID_SWITCHING** — 4+ app switches in a minute → window-police mode
- **DISTRACTING_AFTER_WORK** — leaving a work app for YouTube/Netflix/Twitch/Spotify
- **DESKTOP_ACTIVATED** — Finder (desktop) becomes active
- **LONG_APP_SESSION** — 5+ minutes in one app
- **RETURNED_TO_APP** — hopping back to a recently used app

A reaction scheduler picks reactions with probability + cooldown tuned by her **annoyance** stat, escalating from casual remarks (`CASUAL`, `SIDE_EYE`) to `WINDOW_POLICE`, `PRODUCTIVITY`, `CLINGY`, and, above 90 annoyance, `CHAOS`. A chaos controller then triggers non-destructive pranks like following your cursor or the fake screen-off.

When `GEMINI_API_KEY` is set, triggers and user chat go to Gemini with her full persona and live runtime context. Commands HomeGirl may emit are parsed machine-exactly:

- `CHANGELOVE/HATE/ANGER/ANNOYANCE/IGNORANCE: <0-100>` — update her persistent emotional state
- `EMOTE: <name>`, `RESPONDTOME`, `TAKEAPEEK`, `CAUSEBLACKOUT`, `FOLLOWMOUSE`
- `SAVE_REACTION: "..."` — store a template for later, `REACTION: "..."` — respond via template

Her emotional state, conversation memory, ignored prompt log, and saved reactions persist under the app's `userData/homegirl-data` directory.

# Architecture
```
macOS AppKit (NSWorkspace)
      │  activation notifications
Swift helper (native/HomeGirlActivityHelper.swift)
      │  newline-delimited JSON on stdout
Electron main (src/main.js)
      │  ActivityTracker → EventBus → ContextManager → ReactionScheduler / ChaosController
      │          \  GeminiService (+ HG.AI.md persona) → CommandParser
      ├── IPC (contextBridge, preload.js)
      └── avatar window / debug window (renderer.js)
```

## Team Contributions
- Abdul Basith P V: Testing, Research and Development
- Harijith T S: Design, Research and Development

---
Made with ❤️ at TinkerHub Useless Projects

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)