## 1. ADB Package Foundation

- [x] 1.1 Evaluate and select a packaged third-party ADB library that works with Electron packaging, TypeScript, device commands, install flows, and screenshots.
- [x] 1.2 Wrap the selected ADB library inside `packages/adb` behind project-owned interfaces, with CLI fallback only if needed.
- [x] 1.3 Add typed command/result abstractions that capture stdout, stderr, exit code, timeout, and structured errors where the underlying library exposes them.
- [x] 1.4 Implement `listDevices()` and device-state parsing for `device`, `offline`, `unauthorized`, and unknown states.
- [x] 1.5 Add serial-aware `shell`, `screenshot`, package detection, and install helpers for target devices, including Chinese comments for command and error handling boundaries.
- [x] 1.6 Add unit tests for ADB library adapter behavior, device parsing, timeout behavior, and package-detection results.

## 2. Automation Bootstrap Service

- [x] 2.1 Create a device bootstrap service module in the native/automation layer with explicit ADB check, device selection, ATX check, ATX install, and final verification steps.
- [x] 2.2 Define bootstrap status types for `idle`, `checking-adb`, `no-adb`, `no-device`, `checking-atx`, `installing-atx`, `ready`, and `failed`.
- [x] 2.3 Implement an ATX detection strategy that checks the configured package/service and returns structured diagnostics.
- [x] 2.4 Implement an ATX installation strategy with timeout, retry-safe execution, post-install verification, and clear error codes.
- [x] 2.5 Add Chinese comments explaining service responsibilities, state transitions, retry behavior, and future screenshot automation extension points.
- [x] 2.6 Add tests for successful bootstrap, no ADB, no device, ATX already installed, ATX install success, and ATX install failure flows.

## 3. Electron Main and IPC Integration

- [x] 3.1 Initialize the bootstrap service from `apps/desktop/electron/main.ts` after `app.whenReady()` without blocking window creation.
- [x] 3.2 Extend the typed IPC contract with environment bootstrap status and manual retry channels.
- [x] 3.3 Register IPC handlers that read the latest bootstrap status and trigger a guarded bootstrap retry.
- [x] 3.4 Update preload APIs to expose a small environment surface without exposing raw shell or ADB execution.
- [x] 3.5 Remove the existing test-only `window.bot` tap, swipe, and screenshot preload/native methods from the formal IPC contract.
- [x] 3.6 If temporary ADB operation debugging is still needed, move it behind a development-only entry point that is excluded from the formal preload API.

## 4. Desktop Renderer Feedback

- [x] 4.1 Add UI state that loads and displays the current ADB/ATX bootstrap phase, target serial, message, recoverability, and next action.
- [x] 4.2 Remove or replace UI buttons that call the old test-only `window.bot` tap and screenshot methods.
- [x] 4.3 Add a manual retry action for recoverable `no-device`, `no-adb`, and `failed` states.
- [x] 4.4 Add user-facing copy for emulator not opened, device unauthorized/offline, ADB missing, ATX installing, ready, and install failure states.

## 5. Verification and Maintenance

- [x] 5.1 Run typecheck, lint, and relevant package tests for desktop, ADB, and automation modules.
- [x] 5.2 Verify startup behavior with mocked or real ADB outputs for ready, no-device, and ATX-missing cases.
- [x] 5.3 Confirm all new complex logic includes Chinese comments and remains split across package, native service, IPC/preload, and renderer layers.
- [x] 5.4 Document any unresolved ATX package name, installer asset, or device-selection assumptions discovered during implementation.
