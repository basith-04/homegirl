# AGENTS.md

## Project Instructions

You are working on a desktop AI companion built with Electron + TypeScript for macOS.

The primary requirement is **preserving existing functionality while extending the system**. Do not make architectural or behavioral changes unless they are necessary for the requested feature.

## 1. Core Development Rules

- Read the existing codebase before modifying it.
- Identify the current application entry points, Electron main process, renderer process, preload scripts, IPC channels, state management, window-management code, event tracking, and UI/avatar/emote systems.
- Preserve all existing functionality unless the user explicitly asks for a behavior change.
- Do not replace working implementations merely because another approach looks cleaner.
- Make the smallest safe change that satisfies the requirement.
- Before changing an existing interface, IPC contract, event schema, or public function, search all call sites and update them consistently.
- Do not silently remove features, handlers, permissions, event listeners, shortcuts, configuration options, or error handling.
- Avoid introducing polling when an event-driven API is available.
- Keep privileged macOS/Electron operations isolated from renderer code.

## 2. Documentation Lookup Is Required

When implementing or debugging functionality involving Electron, macOS window management, accessibility, application activation, keyboard/window control, or UI automation, **look up the official documentation before relying on assumptions**.

Prefer official documentation:

### Electron

Use the official Electron documentation for APIs and platform behavior, especially:

- BrowserWindow
- BrowserWindow events
- webContents
- IPC
- contextBridge
- preload scripts
- app lifecycle
- globalShortcut
- powerMonitor
- nativeImage
- shell
- process/platform behavior

Official documentation:
https://www.electronjs.org/docs/latest/

### Apple / macOS

Use Apple's official documentation for macOS-specific functionality, especially:

- Accessibility APIs
- Application Services
- NSWorkspace
- NSRunningApplication
- CGWindow APIs
- Core Graphics window information
- Apple Events / Automation
- Accessibility permissions
- window/application activation
- keyboard and UI interaction APIs
- macOS privacy/security restrictions

Prefer:
https://developer.apple.com/documentation/
https://developer.apple.com/documentation/applicationservices
https://developer.apple.com/documentation/appkit
https://developer.apple.com/documentation/coregraphics
https://developer.apple.com/documentation/applicationservices/accessibility

If the required behavior depends on undocumented/private APIs, explicitly recognize that limitation instead of pretending the API is stable.

## 3. macOS Window Switching and UI Control

For features such as:

- detecting the active application
- detecting the frontmost window
- identifying window titles
- tracking application/window changes
- switching applications
- activating/focusing another application
- minimizing or closing windows
- interacting with another application's UI
- sending keyboard input
- accessibility-based UI inspection/control

first determine which macOS API is appropriate.

Do not assume Electron alone can safely control arbitrary macOS windows.

Use a layered architecture where appropriate:

Electron:
- application lifecycle
- companion UI
- renderer
- IPC
- application-level state

macOS/native layer:
- frontmost application detection
- window enumeration
- application activation
- accessibility/UI control
- privileged OS integration

TypeScript:
- typed interface between the application and native functionality
- command/state orchestration
- event normalization

## 4. MCP and TypeScript

MCP tools may be used when available and relevant.

Use MCP for:

- TypeScript/Node.js documentation lookup
- Electron documentation lookup
- macOS/API documentation lookup when an appropriate documentation MCP is available
- repository/codebase inspection
- dependency/API verification
- other development workflows explicitly supported by the configured MCP servers

Before implementing a TypeScript/Electron API that is uncertain or version-sensitive, use the available documentation MCP or official documentation to verify:

1. the API exists
2. the API is supported on the project's target Electron/Node version
3. the API's expected arguments and return values
4. whether it runs in main, preload, or renderer context
5. relevant security restrictions

Do not invent MCP tools, namespaces, functions, or API signatures. Inspect the available MCP/tool definitions first.

## 5. Security Boundaries

Follow Electron security best practices.

- Keep `nodeIntegration` disabled in renderer processes unless the existing architecture explicitly requires otherwise.
- Prefer `contextIsolation: true`.
- Expose only narrowly scoped APIs through `contextBridge`.
- Do not expose arbitrary filesystem, shell, process, or native execution capabilities to renderer code.
- Validate IPC inputs.
- Keep OS-level automation behind explicit, typed IPC/native boundaries.
- Treat accessibility/automation functionality as privileged functionality.
- Never bypass macOS security permissions or attempt to evade user consent.

## 6. Window Tracking Architecture

If implementing window/application tracking:

- distinguish application changes from window changes
- normalize native events into a stable TypeScript event model
- avoid excessive polling
- debounce/coalesce noisy events where necessary
- avoid blocking the Electron main process
- clean up observers/listeners when the application shuts down
- handle applications opening/closing during tracking
- handle inaccessible applications gracefully
- handle permission denial gracefully
- do not crash when a target window disappears between detection and action

A useful conceptual model is:

`macOS event/native source -> native adapter -> Electron main process -> typed IPC -> renderer/state -> companion behavior`

Do not tightly couple the renderer to macOS implementation details.

## 7. UI Control

When controlling another application's UI:

- prefer documented Accessibility APIs where possible
- verify the target application supports the required accessibility attributes/actions
- expect different applications to expose different accessibility trees
- never assume a window title or UI element will always exist
- use stable identifiers/roles when available
- handle unavailable or stale accessibility elements
- fail safely if the target disappears
- never make destructive actions irreversible without the appropriate user intent/confirmation mechanism

For actions such as closing, quitting, switching, or manipulating another application, preserve the existing product's safety/behavioral rules.

## 8. Functional Preservation Requirement

**This is a hard requirement.**

Every implementation must preserve existing functionality.

Before modifying code:

1. inspect the existing behavior
2. identify dependencies and call sites
3. identify existing IPC/event contracts
4. identify existing user-facing behavior
5. identify existing permissions and configuration

After modifying code:

1. verify existing functionality still works
2. verify the new functionality works
3. verify existing IPC channels still work
4. verify existing event tracking still works
5. verify the companion/avatar/emote system still works
6. verify the application can start normally
7. verify failure/permission cases do not break the application

Do not declare a feature complete merely because the new code compiles.

## 9. TypeScript Quality

- Use strict TypeScript types.
- Avoid `any` unless there is a documented reason.
- Keep native/platform-specific types behind adapters.
- Prefer discriminated unions for events/actions.
- Keep IPC request/response types explicit.
- Do not duplicate types between main, preload, and renderer if a shared type can safely be used.
- Preserve backwards compatibility with existing types where practical.
- Handle nullable/optional native values explicitly.

## 10. Testing and Verification

For every meaningful change:

- run the project's existing typecheck
- run existing tests
- run linting if configured
- build/package if practical
- manually verify affected macOS behavior when it depends on native APIs

For window-management features, specifically test:

- application switch
- window switch
- window disappears
- application quits
- permission denied
- inaccessible window
- multiple windows
- minimized windows
- rapidly changing active windows
- Electron companion window itself becoming active
- startup/shutdown cleanup

Do not fabricate test results.

## 11. Documentation and Investigation Strategy

When uncertain:

1. inspect the repository
2. inspect package versions
3. inspect existing implementation
4. consult official Electron documentation
5. consult official Apple documentation
6. use available MCP documentation/code tools
7. implement the smallest compatible change
8. typecheck/test
9. inspect the diff for unintended behavior changes

If documentation conflicts with an assumption in the existing code, trust the current documented API behavior and adapt carefully without unnecessarily rewriting unrelated code.

## 12. Change Discipline

Do not:

- rewrite the project from scratch
- migrate frameworks without explicit instruction
- replace Electron APIs with random third-party packages without justification
- remove existing functionality to make the new feature easier
- introduce unnecessary dependencies
- weaken Electron security settings for convenience
- hard-code fragile application-specific behavior when a documented API exists
- claim macOS control is possible when the OS permission/API model prevents it

When a platform limitation exists, explain it and implement the closest robust alternative.

## 13. Definition of Done

A task is complete only when:

- the requested functionality is implemented
- existing functionality remains intact
- TypeScript types are correct
- Electron process boundaries remain secure
- macOS permissions are handled correctly
- official documentation was consulted for platform-sensitive behavior
- available MCP tooling was used when appropriate
- tests/typechecks/builds pass where applicable
- no unrelated behavior was changed
- the final diff is understandable and minimal
