<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />

# HomeGirl.AI 🎯

## Basic Details
### Team Name: Varangians

### Team Members
- Team Lead: Abdul Basith P V
- Member 2: Harijith T S

### Project Description
HomeGirl is a translucent, always-on-top AI companion that lives on your desktop. She tracks your active apps on macOS, reacts to your work-and-slack-off habits, and talks back with real AI-generated personality — an extremely close friend who has absolutely no respect for your desire to be left alone.

## The Problem (that doesn't exist)
Every productivity tool desperately tries to help you focus. No one was guarding you against the *real* problem: a close friend who refuses to leave you alone while you "just quickly check YouTube" for the fourth time today.

## The Solution (that nobody asked for)
A desktop gremlin with a 0-to-100 emotional state (love, hate, anger, annoyance, ignorance) who scores every window you switch to, roasts you for tutorial hell, throws fake screen-off tantrums, and follows your mouse around until you acknowledge her.

## Technical Details
### Technologies/Components Used
For Software:
- Electron 37 — always-on-top avatar window, chat UI, blackout overlay
- Node.js (CommonJS) — main process, renderer, preload, IPC
- Swift + AppKit — native `NSWorkspace` activity helper emitting newline-delimited JSON
- Google Gemini (`@google/genai`) — personality generation via the Interactions API
- Vanilla JS + CSS in the renderer — no frontend framework

For Hardware:
- No additional hardware required
- Designed for macOS desktop/laptop systems

### Implementation
For Software:

# Installation
```bash
npm install

export GEMINI_API_KEY="your-key"  # optional; HomeGirl falls back to local reactions without it
export GEMINI_MODEL="gemini-3-flash-preview"  # optional override
```

# Run
```bash
npm start
```

`npm start` compiles the Swift activity helper into `build/` first, then launches Electron. On Linux/Windows the native tracker is skipped gracefully and the app still runs.

Place the HomeGirl persona in `HG.AI.md` at the repository root. Gemini reads this file for every request, so persona changes require no rebuild. Keep the API key in the environment or `.env` — never in this file, the renderer, or source control.

### Project Documentation
For Software:

# Screenshots

### HomeGirl on the Desktop

<img width="1470" height="953" alt="Screenshot 2026-09-13 at 9 37 36 AM" src="https://github.com/user-attachments/assets/98cc959e-5952-4244-ab00-ea5436367a53" />


*HomeGirl hanging around on the desktop, waiting for an opportunity to cause problems.*

### Real-Time Window Detection

<img width="1554" height="1012" alt="windowdetection" src="https://github.com/user-attachments/assets/79dd5dea-af37-4b7e-8fed-9fd57fdc7bed" />


*HomeGirl detects the active application and reacts when you switch to WhatsApp instead of doing your work.*

### AI-Powered Annoyance

<img width="1460" height="953" alt="Screenshot 2026-09-13 at 8 54 33 AM" src="https://github.com/user-attachments/assets/c2caefc2-990d-4681-9e0e-65d700ed6420" />


*HomeGirl generates an annoying response based on what you're doing and how you're treating her.*

### Chaos Mode

<img width="1280" height="832" alt="locked" src="https://github.com/user-attachments/assets/cd504b62-aac1-4e89-a4ab-a47cfeae88f0" />



*When ordinary nagging isn't enough, HomeGirl escalates to a fake screen-off prank.*

# Diagrams
```text
macOS AppKit (NSWorkspace)
      │ activation notifications
      ▼
Swift helper (native/HomeGirlActivityHelper.swift)
      │ newline-delimited JSON on stdout
      ▼
Electron main (src/main.js)
      │
      ├── ActivityTracker
      │       ↓
      │   EventBus
      │       ↓
      │   ContextManager
      │       ↓
      │   ReactionScheduler / ChaosController
      │
      ├── GeminiService (+ HG.AI.md persona)
      │       ↓
      │   CommandParser
      │
      ├── IPC (contextBridge, preload.js)
      │
      └── avatar window / debug window (renderer.js)
```
*Architecture showing how macOS activity events flow from the native Swift helper through Electron's activity and reaction systems.*

### Project Demo
# Video
[Watch the HomeGirl.AI Demo](https://drive.google.com/file/d/1y7iaDPYheFC4-gxP_P68wGYIRi-0OiGd/view?usp=drivesdk)
# Additional Demos
- GitHub Repository: https://github.com/basith-04/homegirl.ai

## Team Contributions
- Abdul Basith P V: Research and Development
- Harijith T S: Design, Research and Development

---

Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)
